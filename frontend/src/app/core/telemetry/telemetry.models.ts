export type InstrumentMode = 'ON' | 'OFF' | 'STANDBY' | 'ERROR' | 'CALIBRATING';

export interface TelemetryData {
  timestamp: string;
  temperature: number;
  voltage: number;
  current: number;
  power: number;
  sensorPointing: number;
  instrumentMode: InstrumentMode;
  signalStrength: number;
  dataRate: number;
  batteryLevel: number;
}

export interface TelemetryAlert {
  type: 'WARNING' | 'CRITICAL';
  param: string;
  value: number;
  message: string;
  timestamp: string;
}

export interface TelemetryParameter {
  name: string;
  label: string;
  unit: string;
  min?: number;
  max?: number;
  warnHigh?: number;
  warnLow?: number;
  critHigh?: number;
  critLow?: number;
}

export type StatusLevel = 'nominal' | 'warning' | 'critical' | 'off' | 'unknown';

export function getStatusLevel(
  value: number,
  param: Partial<TelemetryParameter>
): StatusLevel {
  if (param.critHigh !== undefined && value >= param.critHigh) return 'critical';
  if (param.critLow !== undefined && value <= param.critLow) return 'critical';
  if (param.warnHigh !== undefined && value >= param.warnHigh) return 'warning';
  if (param.warnLow !== undefined && value <= param.warnLow) return 'warning';
  return 'nominal';
}
