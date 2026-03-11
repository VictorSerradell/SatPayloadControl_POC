import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CommandLog, CommandStatus, CommandType } from "./entities/command-log.entity";
import { SendCommandDto } from "./dto/send-command.dto";
import { EventsService } from "../events/events.service";
import { EventType, EventSeverity } from "../events/entities/event.entity";

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);

  constructor(
    @InjectRepository(CommandLog)
    private commandRepo: Repository<CommandLog>,
    private eventsService: EventsService,
  ) {}

  getCatalog() {
    return [
      {
        type: "INSTRUMENT_ON", label: "Power ON Instrument",
        description: "Powers on the specified instrument",
        requiresConfirmation: false, riskLevel: "LOW",
        applicableInstruments: ["CAMERA_VIS", "CAMERA_IR", "SAR_ANTENNA", "TELECOM_TX"],
      },
      {
        type: "INSTRUMENT_OFF", label: "Power OFF Instrument",
        description: "Shuts down the specified instrument",
        requiresConfirmation: true, riskLevel: "MEDIUM",
        applicableInstruments: ["CAMERA_VIS", "CAMERA_IR", "SAR_ANTENNA", "TELECOM_TX"],
      },
      {
        type: "CHANGE_MODE", label: "Change Instrument Mode",
        description: "Changes the operational mode of an instrument",
        requiresConfirmation: false, riskLevel: "LOW",
        applicableInstruments: ["CAMERA_VIS", "CAMERA_IR", "SAR_ANTENNA"],
        availableModes: ["IMAGING", "STANDBY", "CALIBRATION", "DIAGNOSTIC"],
      },
      {
        type: "POINT_SENSOR", label: "Point Sensor",
        description: "Rotates sensor to specified azimuth angle (0-360°)",
        requiresConfirmation: false, riskLevel: "LOW",
        applicableInstruments: ["CAMERA_VIS", "CAMERA_IR"],
      },
      {
        type: "CALIBRATE", label: "Run Calibration",
        description: "Initiates internal calibration sequence (~60s)",
        requiresConfirmation: true, riskLevel: "MEDIUM",
        applicableInstruments: ["CAMERA_VIS", "CAMERA_IR", "SAR_ANTENNA"],
      },
      {
        type: "SAFE_MODE", label: "Enter Safe Mode",
        description: "Forces payload into minimal-power safe configuration",
        requiresConfirmation: true, riskLevel: "HIGH",
        applicableInstruments: ["PAYLOAD_CTRL"],
      },
      {
        type: "RESET", label: "Reset Instrument",
        description: "Hard reset of the instrument processor",
        requiresConfirmation: true, riskLevel: "HIGH",
        applicableInstruments: ["CAMERA_VIS", "CAMERA_IR", "SAR_ANTENNA", "TELECOM_TX"],
      },
    ];
  }

  async send(dto: SendCommandDto, userId: string) {
    // Validate command vs target
    this.validateCommandForTarget(dto);

    const command = this.commandRepo.create({
      ...dto,
      status: CommandStatus.SENT,
      sentBy: { id: userId } as any,
    });
    await this.commandRepo.save(command);

    this.logger.log(
      `Command sent: ${dto.commandType} -> ${dto.targetInstrument} by user ${userId}`,
    );

    // Log event
    await this.eventsService.create({
      type: EventType.COMMAND,
      severity: EventSeverity.INFO,
      title: `TC: ${dto.commandType}`,
      message: `${dto.commandType} sent to ${dto.targetInstrument}. Note: ${dto.operatorNote || "—"}`,
      source: "GROUND_OPERATOR",
      metadata: { commandId: command.id, instrument: dto.targetInstrument },
    });

    // Simulate async ACK (in real system this comes from payload TM)
    this.simulateCommandExecution(command.id, dto.commandType);

    return {
      commandId: command.id,
      status: CommandStatus.SENT,
      message: "Command sent successfully. Awaiting acknowledgement.",
      estimatedExecutionMs: this.getEstimatedExecutionTime(dto.commandType),
    };
  }

  private validateCommandForTarget(dto: SendCommandDto): void {
    if (dto.commandType === CommandType.CHANGE_MODE && !dto.targetMode) {
      throw new BadRequestException("targetMode is required for CHANGE_MODE command");
    }
    if (dto.commandType === CommandType.POINT_SENSOR && dto.pointingAngle === undefined) {
      throw new BadRequestException("pointingAngle is required for POINT_SENSOR command");
    }
  }

  private getEstimatedExecutionTime(commandType: CommandType): number {
    const times: Record<string, number> = {
      INSTRUMENT_ON: 3000, INSTRUMENT_OFF: 2000, CHANGE_MODE: 1500,
      POINT_SENSOR: 5000, CALIBRATE: 60000, SAFE_MODE: 2000, RESET: 8000,
    };
    return times[commandType] || 3000;
  }

  private async simulateCommandExecution(commandId: string, commandType: CommandType) {
    const delay = this.getEstimatedExecutionTime(commandType);
    setTimeout(async () => {
      try {
        const success = Math.random() > 0.05; // 95% success rate
        await this.commandRepo.update(commandId, {
          status: success ? CommandStatus.EXECUTED : CommandStatus.FAILED,
          acknowledgedAt: new Date(),
          executedAt: success ? new Date() : undefined,
          errorMessage: success ? undefined : "Payload NAK: instrument not responding",
        });

        await this.eventsService.create({
          type: EventType.COMMAND,
          severity: success ? EventSeverity.INFO : EventSeverity.ERROR,
          title: success ? "TC Executed" : "TC Failed",
          message: success
            ? `Command ${commandType} executed successfully (ID: ${commandId})`
            : `Command ${commandType} FAILED: payload not responding (ID: ${commandId})`,
          source: "PAYLOAD_TM",
          metadata: { commandId, success },
        });
      } catch (err) {
        this.logger.error("Failed to update command status:", err);
      }
    }, delay);
  }

  async getHistory(limit = 50) {
    return this.commandRepo.find({
      order: { sentAt: "DESC" },
      take: Math.min(limit, 500),
      relations: ["sentBy"],
    });
  }

  async getStatus(id: string) {
    return this.commandRepo.findOne({ where: { id }, relations: ["sentBy"] });
  }
}
