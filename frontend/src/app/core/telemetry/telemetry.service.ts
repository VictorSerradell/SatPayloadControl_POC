import { Injectable, signal, computed, inject, OnDestroy } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { io, Socket } from "socket.io-client";
import { Subject } from "rxjs";
import { AuthService } from "../auth/auth.service";
import { environment } from "../../../environments/environment";
import { TelemetryData, TelemetryAlert, StatusLevel, getStatusLevel } from "./telemetry.models";

const THRESHOLDS = {
  temperature: { warnHigh: 50, critHigh: 70 },
  power:       { warnHigh: 45, critHigh: 55 },
  batteryLevel:{ warnLow: 20, critLow: 10 },
  voltage:     { warnLow: 27.5, critLow: 27.0 },
};

@Injectable({ providedIn: "root" })
export class TelemetryService implements OnDestroy {
  private http    = inject(HttpClient);
  private auth    = inject(AuthService);
  private socket: Socket | null = null;

  // ── Reactive signals ─────────────────────────────────────────────────────
  readonly latest   = signal<TelemetryData | null>(null);
  readonly history  = signal<TelemetryData[]>([]);
  readonly alerts   = signal<TelemetryAlert[]>([]);
  readonly connected = signal<boolean>(false);

  // Computed status per parameter
  readonly tempStatus = computed<StatusLevel>(() =>
    this.statusFor("temperature", this.latest()?.temperature));
  readonly powerStatus = computed<StatusLevel>(() =>
    this.statusFor("power", this.latest()?.power));
  readonly batteryStatus = computed<StatusLevel>(() =>
    this.statusFor("batteryLevel", this.latest()?.batteryLevel));
  readonly voltageStatus = computed<StatusLevel>(() =>
    this.statusFor("voltage", this.latest()?.voltage));
  readonly modeStatus = computed<StatusLevel>(() => {
    const mode = this.latest()?.instrumentMode;
    if (!mode) return "unknown";
    if (mode === "ERROR") return "critical";
    if (mode === "STANDBY" || mode === "CALIBRATING") return "warning";
    if (mode === "OFF") return "off";
    return "nominal";
  });

  // Alert events for external subscription
  readonly alert$ = new Subject<TelemetryAlert>();

  connect() {
    const token = this.auth.getToken();
    if (!token || this.socket?.connected) return;

    this.socket = io(`${environment.wsUrl}${environment.wsNamespace}`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on("connect", () => {
      this.connected.set(true);
      console.log("🛰️ WS connected:", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      this.connected.set(false);
      console.warn("🔌 WS disconnected");
    });

    this.socket.on("telemetry", (data: TelemetryData) => {
      this.latest.set(data);
      // Append to rolling history (keep last 300 = 10 min at 2s)
      this.history.update(h => {
        const next = [...h, data];
        return next.length > 300 ? next.slice(-300) : next;
      });
    });

    this.socket.on("telemetry:history", (data: TelemetryData[]) => {
      this.history.set(data);
    });

    this.socket.on("telemetry:alert", (alert: TelemetryAlert) => {
      this.alerts.update(a => [alert, ...a].slice(0, 50));
      this.alert$.next(alert);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  loadHistory(from?: Date, to?: Date, limit = 500) {
    const params: any = { limit };
    if (from) params["from"] = from.toISOString();
    if (to)   params["to"]   = to.toISOString();
    return this.http.get<TelemetryData[]>(`${environment.apiUrl}/telemetry/history`, { params });
  }

  loadParameters() {
    return this.http.get<any[]>(`${environment.apiUrl}/telemetry/parameters`);
  }

  dismissAlert(index: number) {
    this.alerts.update(a => a.filter((_, i) => i !== index));
  }

  clearAlerts() {
    this.alerts.set([]);
  }

  private statusFor(param: keyof typeof THRESHOLDS, value?: number): StatusLevel {
    if (value === undefined || value === null) return "unknown";
    return getStatusLevel(value, THRESHOLDS[param] ?? {});
  }

  ngOnDestroy() { this.disconnect(); }
}
