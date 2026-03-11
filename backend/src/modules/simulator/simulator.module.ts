import { Module } from "@nestjs/common";
import { SimulatorService } from "./simulator.service";
import { TelemetryModule } from "../telemetry/telemetry.module";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [TelemetryModule, EventsModule],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
