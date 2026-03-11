import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum InstrumentMode {
  ON = 'ON',
  OFF = 'OFF',
  STANDBY = 'STANDBY',
  ERROR = 'ERROR',
  CALIBRATING = 'CALIBRATING',
}

@Entity('telemetry_data')
export class TelemetryData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz' })
  @Index()
  timestamp: Date;

  @Column({ type: 'float' })
  temperature: number; // °C

  @Column({ type: 'float' })
  voltage: number; // V

  @Column({ type: 'float' })
  current: number; // mA

  @Column({ type: 'float' })
  power: number; // W

  @Column({ type: 'float' })
  sensorPointing: number; // degrees

  @Column({ type: 'enum', enum: InstrumentMode })
  instrumentMode: InstrumentMode;

  @Column({ type: 'float', nullable: true })
  signalStrength: number; // dBm

  @Column({ type: 'int', nullable: true })
  dataRate: number; // kbps

  @Column({ type: 'float', nullable: true })
  batteryLevel: number; // %

  @CreateDateColumn()
  receivedAt: Date;
}
