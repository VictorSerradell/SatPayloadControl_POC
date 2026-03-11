import {
  Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TelemetryService } from './telemetry.service';

@ApiTags('telemetry')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('telemetry')
export class TelemetryController {
  constructor(private telemetryService: TelemetryService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get latest telemetry snapshot' })
  getLatest() {
    const data = this.telemetryService.getLatest();
    return data || { message: 'No telemetry data yet. Simulator starting up...' };
  }

  @Get('buffer')
  @ApiOperation({ summary: 'Get last N readings from memory buffer' })
  @ApiQuery({ name: 'count', required: false, type: Number })
  getBuffer(@Query('count', new DefaultValuePipe(60), ParseIntPipe) count: number) {
    return this.telemetryService.getBuffer(count);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get historical telemetry from database' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit', new DefaultValuePipe(500), ParseIntPipe) limit?: number,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.telemetryService.getHistory(fromDate, toDate, limit);
  }

  @Get('parameters')
  @ApiOperation({ summary: 'Get telemetry parameter catalog with thresholds' })
  getParameters() {
    return this.telemetryService.getParameters();
  }
}
