import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommandsController } from "./commands.controller";
import { CommandsService } from "./commands.service";
import { CommandLog } from "./entities/command-log.entity";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [TypeOrmModule.forFeature([CommandLog]), EventsModule],
  controllers: [CommandsController],
  providers: [CommandsService],
  exports: [CommandsService],
})
export class CommandsModule {}
