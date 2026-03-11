import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, Request, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { CommandsService } from './commands.service';
import { SendCommandDto } from './dto/send-command.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('commands')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('commands')
export class CommandsController {
  constructor(private commandsService: CommandsService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Get available telecommand catalog' })
  getCatalog() {
    return this.commandsService.getCatalog();
  }

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Send a telecommand to the payload (operator/admin only)' })
  send(@Body() dto: SendCommandDto, @Request() req: any) {
    return this.commandsService.send(dto, req.user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get command history log' })
  getHistory(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.commandsService.getHistory(limit);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get status of a specific command' })
  getStatus(@Param('id') id: string) {
    return this.commandsService.getStatus(id);
  }
}
