import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum EventType {
  COMMAND = 'COMMAND',
  ALERT = 'ALERT',
  INFO = 'INFO',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  SYSTEM = 'SYSTEM',
}

export enum EventSeverity {
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

@Entity('events')
@Index(['type'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  @Column({ type: 'enum', enum: EventSeverity, default: EventSeverity.INFO })
  severity: EventSeverity;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: 'SYSTEM' })
  source: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
