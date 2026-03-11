import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException } from "@nestjs/common";
import { CommandsService } from "./commands.service";
import { CommandLog, CommandType, InstrumentId } from "./entities/command-log.entity";
import { EventsService } from "../events/events.service";

const mockRepo = {
  create: jest.fn().mockImplementation((dto) => ({ ...dto, id: "cmd-uuid-1" })),
  save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockEventsService = {
  create: jest.fn().mockResolvedValue({}),
  createAlert: jest.fn().mockResolvedValue({}),
};

describe("CommandsService", () => {
  let service: CommandsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandsService,
        { provide: getRepositoryToken(CommandLog), useValue: mockRepo },
        { provide: EventsService, useValue: mockEventsService },
      ],
    }).compile();
    service = module.get<CommandsService>(CommandsService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("should return command catalog", () => {
    const catalog = service.getCatalog();
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog[0]).toHaveProperty("type");
    expect(catalog[0]).toHaveProperty("riskLevel");
  });

  it("should send a valid command", async () => {
    const dto = {
      commandType: CommandType.INSTRUMENT_ON,
      targetInstrument: InstrumentId.CAMERA_VIS,
    };
    const result = await service.send(dto, "user-uuid-1");
    expect(result.commandId).toBeDefined();
    expect(result.status).toBe("SENT");
    expect(mockEventsService.create).toHaveBeenCalled();
  });

  it("should throw BadRequestException for CHANGE_MODE without targetMode", async () => {
    await expect(
      service.send({
        commandType: CommandType.CHANGE_MODE,
        targetInstrument: InstrumentId.CAMERA_VIS,
      }, "user-uuid-1"),
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw BadRequestException for POINT_SENSOR without pointingAngle", async () => {
    await expect(
      service.send({
        commandType: CommandType.POINT_SENSOR,
        targetInstrument: InstrumentId.CAMERA_VIS,
      }, "user-uuid-1"),
    ).rejects.toThrow(BadRequestException);
  });
});
