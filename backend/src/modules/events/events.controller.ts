import {
  Controller, Get, Patch, Param, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe, ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EventsService } from './events.service';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Get event log (paginated)' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'unread', required: false })
  findAll(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('type') type?: string,
    @Query('unread', new DefaultValuePipe(false), ParseBoolPipe) unread?: boolean,
  ) {
    return this.eventsService.findAll(limit, type, unread);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread alerts/events' })
  getUnreadCount() {
    return this.eventsService.getUnreadCount().then((count) => ({ count }));
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark event as read' })
  markAsRead(@Param('id') id: string) {
    return this.eventsService.markAsRead(id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all events as read' })
  markAllAsRead() {
    return this.eventsService.markAllAsRead();
  }
}
