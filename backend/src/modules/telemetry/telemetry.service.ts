import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TelemetryData } from './entities/telemetry.entity';
import { TelemetryDataDto } from './dto/telemetry.dto';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  // In-memory ring buffer for last 1800 readings (~1h at 2s intervals)
  private readonly buffer: TelemetryDataDto[] = [];
  private readonly BUFFER_SIZE = 1800;

  constructor(
    @InjectRepository(TelemetryData)
    private telemetryRepo: Repository<TelemetryData>,
  ) {}

  async saveReading(dto: TelemetryDataDto): Promise<void> {
    // Update ring buffer
    this.buffer.push(dto);
    if (this.buffer.length > this.BUFFER_SIZE) {
      this.buffer.shift();
    }

    // Persist to DB (async, non-blocking)
    const entity = this.telemetryRepo.create({
      ...dto,
      timestamp: new Date(dto.timestamp),
    });
    this.telemetryRepo.save(entity).catch((err) =>
      this.logger.error(`Failed to persist telemetry: ${err.message}`),
    );
  }

  getLatest(): TelemetryDataDto | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  getBuffer(count = 60): TelemetryDataDto[] {
    return this.buffer.slice(-count);
  }

  async getHistory(from?: Date, to?: Date, limit = 500): Promise<TelemetryData[]> {
    const where: any = {};
    if (from && to) {
      where.timestamp = Between(from, to);
    }
    return this.telemetryRepo.find({
      where,
      order: { timestamp: 'DESC' },
      take: Math.min(limit, 5000),
    });
  }

  getParameters() {
    return [
      { name: 'temperature', label: 'Temperature', unit: '°C', min: -10, max: 80, warnHigh: 50, critHigh: 70 },
      { name: 'voltage', label: 'Bus Voltage', unit: 'V', min: 27, max: 30, warnLow: 27.5, critLow: 27 },
      { name: 'current', label: 'Current', unit: 'mA', min: 0, max: 2000, warnHigh: 1700, critHigh: 1900 },
      { name: 'power', label: 'Power', unit: 'W', min: 0, max: 60, warnHigh: 45, critHigh: 55 },
      { name: 'batteryLevel', label: 'Battery Level', unit: '%', min: 0, max: 100, warnLow: 20, critLow: 10 },
      { name: 'signalStrength', label: 'Signal Strength', unit: 'dBm', min: -120, max: -40, warnLow: -100, critLow: -110 },
      { name: 'dataRate', label: 'Data Rate', unit: 'kbps', min: 0, max: 4096 },
      { name: 'sensorPointing', label: 'Sensor Pointing', unit: '°', min: 0, max: 360 },
    ];
  }
}
