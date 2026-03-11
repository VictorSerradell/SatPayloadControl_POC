import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { InstrumentMode } from '../entities/telemetry.entity';

export class TelemetryDataDto {
  @ApiProperty()
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Temperature in Celsius', example: 32.5 })
  @IsNumber() @Min(-50) @Max(120)
  temperature: number;

  @ApiProperty({ description: 'Bus voltage in Volts', example: 28.4 })
  @IsNumber() @Min(0) @Max(50)
  voltage: number;

  @ApiProperty({ description: 'Current in milliAmps', example: 1250 })
  @IsNumber() @Min(0) @Max(5000)
  current: number;

  @ApiProperty({ description: 'Power in Watts', example: 35.5 })
  @IsNumber() @Min(0)
  power: number;

  @ApiProperty({ description: 'Sensor pointing angle (0-360 degrees)', example: 45.0 })
  @IsNumber() @Min(0) @Max(360)
  sensorPointing: number;

  @ApiProperty({ enum: InstrumentMode })
  @IsEnum(InstrumentMode)
  instrumentMode: InstrumentMode;

  @ApiProperty({ description: 'Signal strength in dBm', example: -72 })
  @IsNumber()
  signalStrength: number;

  @ApiProperty({ description: 'Data rate in kbps', example: 1024 })
  @IsNumber() @Min(0)
  dataRate: number;

  @ApiProperty({ description: 'Battery level %', example: 85.2 })
  @IsNumber() @Min(0) @Max(100)
  batteryLevel: number;
}

export class TelemetryHistoryQueryDto {
  @ApiProperty({ required: false, example: '2026-01-01T00:00:00Z' })
  from?: string;

  @ApiProperty({ required: false, example: '2026-01-02T00:00:00Z' })
  to?: string;

  @ApiProperty({ required: false, example: 'temperature', description: 'Filter by parameter name' })
  param?: string;

  @ApiProperty({ required: false, example: 100 })
  limit?: number;
}
