import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum CommandType {
  INSTRUMENT_ON = 'INSTRUMENT_ON',
  INSTRUMENT_OFF = 'INSTRUMENT_OFF',
  CHANGE_MODE = 'CHANGE_MODE',
  POINT_SENSOR = 'POINT_SENSOR',
  CALIBRATE = 'CALIBRATE',
  SAFE_MODE = 'SAFE_MODE',
  RESET = 'RESET',
  SET_DATA_RATE = 'SET_DATA_RATE',
}

export enum InstrumentId {
  CAMERA_VIS = 'CAMERA_VIS',
  CAMERA_IR = 'CAMERA_IR',
  SAR_ANTENNA = 'SAR_ANTENNA',
  TELECOM_TX = 'TELECOM_TX',
  PAYLOAD_CTRL = 'PAYLOAD_CTRL',
}

export enum CommandStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
}

@Entity('command_logs')
export class CommandLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: CommandType })
  commandType: CommandType;

  @Column({ type: 'enum', enum: InstrumentId })
  targetInstrument: InstrumentId;

  @Column({ type: 'enum', enum: CommandStatus, default: CommandStatus.PENDING })
  status: CommandStatus;

  @Column({ nullable: true })
  targetMode: string;

  @Column({ type: 'float', nullable: true })
  pointingAngle: number;

  @Column({ nullable: true })
  operatorNote: string;

  @Column({ nullable: true })
  errorMessage: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  sentBy: User;

  @CreateDateColumn()
  @Index()
  sentAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acknowledgedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  executedAt: Date;
}
