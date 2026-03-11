import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TelemetryGateway } from "../telemetry/telemetry.gateway";
import { TelemetryService } from "../telemetry/telemetry.service";
import { EventsService } from "../events/events.service";
import { EventType, EventSeverity } from "../events/entities/event.entity";
import { InstrumentMode } from "../telemetry/entities/telemetry.entity";

interface PayloadState {
  temperature: number;
  voltage: number;
  current: number;
  power: number;
  sensorPointing: number;
  instrumentMode: InstrumentMode;
  batteryLevel: number;
  signalStrength: number;
  dataRate: number;
  tick: number;
  // Tracking for alert deduplication
  lastTempAlertTick: number;
  lastPowerAlertTick: number;
  lastBatteryAlertTick: number;
  inErrorMode: boolean;
}

@Injectable()
export class SimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);
  private interval: NodeJS.Timeout;
  private intervalMs: number;

  private state: PayloadState = {
    temperature: 24.0,
    voltage: 28.5,
    current: 1200,
    power: 34.2,
    sensorPointing: 0,
    instrumentMode: InstrumentMode.ON,
    batteryLevel: 85,
    signalStrength: -72,
    dataRate: 1024,
    tick: 0,
    lastTempAlertTick: -999,
    lastPowerAlertTick: -999,
    lastBatteryAlertTick: -999,
    inErrorMode: false,
  };

  constructor(
    private readonly gateway: TelemetryGateway,
    private readonly telemetryService: TelemetryService,
    private readonly eventsService: EventsService,
    private readonly configService: ConfigService,
  ) {
    this.intervalMs = this.configService.get<number>("TELEMETRY_INTERVAL_MS", 2000);
  }

  onModuleInit() {
    this.logger.log(`Simulator starting. Interval: ${this.intervalMs}ms`);
    this.interval = setInterval(() => this.tick(), this.intervalMs);
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
    this.logger.log("Simulator stopped.");
  }

  private tick() {
    const s = this.state;
    s.tick++;
    const t = s.tick;

    // ── Temperature: random walk + sinusoidal orbital variation ──────────────
    // Simulates thermal cycling due to eclipse/sunlight transitions
    s.temperature = this.clamp(
      s.temperature + (Math.random() - 0.48) * 0.6 + Math.sin(t * 0.08) * 0.4,
      -5, 85,
    );

    // ── Voltage: small noise around nominal 28.5V ────────────────────────────
    s.voltage = this.clamp(
      s.voltage + (Math.random() - 0.5) * 0.08,
      27.0, 29.8,
    );

    // ── Current: varies with instrument mode ─────────────────────────────────
    const baseCurrentByMode = {
      [InstrumentMode.ON]: 1200, [InstrumentMode.STANDBY]: 400,
      [InstrumentMode.OFF]: 50, [InstrumentMode.ERROR]: 1600,
      [InstrumentMode.CALIBRATING]: 900,
    };
    const baseCurrent = baseCurrentByMode[s.instrumentMode] || 1200;
    s.current = this.clamp(
      s.current * 0.95 + baseCurrent * 0.05 + (Math.random() - 0.5) * 30,
      0, 2200,
    );

    // ── Power = V * I ────────────────────────────────────────────────────────
    s.power = (s.voltage * s.current) / 1000;

    // ── Battery: slow discharge + charge from solar (sinusoidal) ────────────
    s.batteryLevel = this.clamp(
      s.batteryLevel + Math.sin(t * 0.05) * 0.15 + (Math.random() - 0.51) * 0.05,
      5, 100,
    );

    // ── Signal strength: varies with antenna pointing ────────────────────────
    s.signalStrength = this.clamp(
      -72 + Math.sin(t * 0.12) * 15 + (Math.random() - 0.5) * 3,
      -115, -45,
    );

    // ── Data rate: correlates with signal ────────────────────────────────────
    const signalFactor = (s.signalStrength + 115) / 70; // 0..1
    s.dataRate = Math.round(this.clamp(
      signalFactor * 2048 + (Math.random() - 0.5) * 128,
      64, 4096,
    ));

    // ── Sensor pointing: continuous slow rotation ────────────────────────────
    s.sensorPointing = (s.sensorPointing + 0.5) % 360;

    // ── Random fault injection (1% chance) ──────────────────────────────────
    if (!s.inErrorMode && Math.random() < 0.01) {
      s.inErrorMode = true;
      s.instrumentMode = InstrumentMode.ERROR;
      this.logger.warn("Simulated instrument fault injected!");
      this.eventsService.create({
        type: EventType.ERROR,
        severity: EventSeverity.ERROR,
        title: "Instrument Fault Detected",
        message: "Simulated fault: instrument entered ERROR mode. Autonomous recovery in 6s.",
        source: "PAYLOAD_TM",
      });
      setTimeout(() => {
        s.instrumentMode = InstrumentMode.ON;
        s.inErrorMode = false;
        this.eventsService.create({
          type: EventType.INFO, severity: EventSeverity.INFO,
          title: "Instrument Recovered",
          message: "Instrument auto-recovered from ERROR mode → ON.",
          source: "PAYLOAD_TM",
        });
      }, 6000);
    }

    const data = {
      timestamp: new Date().toISOString(),
      temperature: +s.temperature.toFixed(2),
      voltage: +s.voltage.toFixed(3),
      current: +s.current.toFixed(1),
      power: +s.power.toFixed(2),
      sensorPointing: +s.sensorPointing.toFixed(1),
      instrumentMode: s.instrumentMode,
      batteryLevel: +s.batteryLevel.toFixed(1),
      signalStrength: +s.signalStrength.toFixed(1),
      dataRate: s.dataRate,
    };

    // Broadcast to all WS clients
    this.gateway.broadcastTelemetry(data);

    // Persist to DB + buffer
    this.telemetryService.saveReading(data as any);

    // Check thresholds and generate alerts (debounced: once every 30 ticks)
    this.checkAlerts(data);
  }

  private checkAlerts(data: any) {
    const s = this.state;
    const tick = s.tick;
    const DEBOUNCE = 30;

    if (data.temperature > 70 && tick - s.lastTempAlertTick > DEBOUNCE) {
      s.lastTempAlertTick = tick;
      this.gateway.broadcastAlert({ type: "CRITICAL", param: "temperature", value: data.temperature, message: `Temperature CRITICAL: ${data.temperature}°C > 70°C` });
      this.eventsService.createAlert("temperature", data.temperature, 70, true);
    } else if (data.temperature > 50 && tick - s.lastTempAlertTick > DEBOUNCE) {
      s.lastTempAlertTick = tick;
      this.gateway.broadcastAlert({ type: "WARNING", param: "temperature", value: data.temperature, message: `Temperature WARNING: ${data.temperature}°C > 50°C` });
      this.eventsService.createAlert("temperature", data.temperature, 50, false);
    }

    if (data.power > 55 && tick - s.lastPowerAlertTick > DEBOUNCE) {
      s.lastPowerAlertTick = tick;
      this.gateway.broadcastAlert({ type: "CRITICAL", param: "power", value: data.power, message: `Power CRITICAL: ${data.power}W > 55W` });
      this.eventsService.createAlert("power", data.power, 55, true);
    } else if (data.power > 45 && tick - s.lastPowerAlertTick > DEBOUNCE) {
      s.lastPowerAlertTick = tick;
      this.gateway.broadcastAlert({ type: "WARNING", param: "power", value: data.power, message: `Power WARNING: ${data.power}W > 45W` });
      this.eventsService.createAlert("power", data.power, 45, false);
    }

    if (data.batteryLevel < 15 && tick - s.lastBatteryAlertTick > DEBOUNCE) {
      s.lastBatteryAlertTick = tick;
      this.gateway.broadcastAlert({ type: "WARNING", param: "batteryLevel", value: data.batteryLevel, message: `Battery LOW: ${data.batteryLevel}%` });
      this.eventsService.createAlert("batteryLevel", data.batteryLevel, 15, false);
    }
  }

  private get t() { return this.state.tick; }

  private clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }

  // Public method to force state changes (from command execution)
  applyCommand(commandType: string, targetMode?: string) {
    switch (commandType) {
      case "INSTRUMENT_ON": this.state.instrumentMode = InstrumentMode.ON; break;
      case "INSTRUMENT_OFF": this.state.instrumentMode = InstrumentMode.OFF; break;
      case "SAFE_MODE": this.state.instrumentMode = InstrumentMode.STANDBY; break;
      case "CALIBRATE": this.state.instrumentMode = InstrumentMode.CALIBRATING;
        setTimeout(() => { this.state.instrumentMode = InstrumentMode.ON; }, 8000);
        break;
    }
  }

  getState() {
    return { ...this.state, clientCount: this.gateway.clientCount };
  }
}
