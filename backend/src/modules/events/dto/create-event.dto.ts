import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { EventType, EventSeverity } from '../entities/event.entity';

export class CreateEventDto {
  @IsEnum(EventType)
  type: EventType;

  @IsEnum(EventSeverity)
  severity: EventSeverity;

  @IsString()
  @MaxLength(128)
  title: string;

  @IsString()
  @MaxLength(1024)
  message: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
