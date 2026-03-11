import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventType, EventSeverity } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
  ) {}

  async create(dto: Partial<CreateEventDto>): Promise<Event> {
    const event = this.eventRepo.create({
      type: dto.type || EventType.INFO,
      severity: dto.severity || EventSeverity.INFO,
      title: dto.title || 'System Event',
      message: dto.message || '',
      source: dto.source || 'SYSTEM',
      metadata: dto.metadata,
    });
    const saved = await this.eventRepo.save(event);
    this.logger.log(`[${saved.severity}] ${saved.title}: ${saved.message}`);
    return saved;
  }

  async createAlert(param: string, value: number, threshold: number, isCritical: boolean) {
    return this.create({
      type: EventType.ALERT,
      severity: isCritical ? EventSeverity.CRITICAL : EventSeverity.WARNING,
      title: `${isCritical ? 'CRITICAL' : 'WARNING'}: ${param} out of range`,
      message: `${param} = ${value.toFixed(2)} exceeds ${isCritical ? 'critical' : 'warning'} threshold of ${threshold}`,
      source: 'TELEMETRY_MONITOR',
      metadata: { param, value, threshold, isCritical },
    });
  }

  async findAll(limit = 100, type?: string, unreadOnly = false) {
    const query = this.eventRepo.createQueryBuilder('event')
      .orderBy('event.createdAt', 'DESC')
      .take(Math.min(limit, 1000));

    if (type) query.andWhere('event.type = :type', { type });
    if (unreadOnly) query.andWhere('event.isRead = false');

    return query.getMany();
  }

  async getUnreadCount(): Promise<number> {
    return this.eventRepo.count({ where: { isRead: false } });
  }

  async markAsRead(id: string) {
    await this.eventRepo.update(id, { isRead: true });
    return { message: 'Event marked as read' };
  }

  async markAllAsRead() {
    await this.eventRepo.update({ isRead: false }, { isRead: true });
    return { message: 'All events marked as read' };
  }
}
