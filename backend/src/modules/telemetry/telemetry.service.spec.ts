import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { TelemetryService } from "./telemetry.service";
import { TelemetryData, InstrumentMode } from "./entities/telemetry.entity";

const mockRepo = {
  create: jest.fn().mockImplementation((d) => d),
  save: jest.fn().mockResolvedValue({}),
  find: jest.fn().mockResolvedValue([]),
};

const sampleReading = {
  timestamp: new Date().toISOString(),
  temperature: 32.5,
  voltage: 28.4,
  current: 1200,
  power: 34.08,
  sensorPointing: 45.0,
  instrumentMode: InstrumentMode.ON,
  signalStrength: -72,
  dataRate: 1024,
  batteryLevel: 85,
};

describe("TelemetryService", () => {
  let service: TelemetryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        { provide: getRepositoryToken(TelemetryData), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<TelemetryService>(TelemetryService);
  });

  it("should return null when buffer is empty", () => {
    expect(service.getLatest()).toBeNull();
  });

  it("should save reading to buffer", async () => {
    await service.saveReading(sampleReading as any);
    const latest = service.getLatest();
    expect(latest).not.toBeNull();
    expect(latest?.temperature).toBe(32.5);
  });

  it("should maintain BUFFER_SIZE limit", async () => {
    for (let i = 0; i < 1900; i++) {
      await service.saveReading({ ...sampleReading, temperature: i } as any);
    }
    const buffer = service.getBuffer(2000);
    expect(buffer.length).toBeLessThanOrEqual(1800);
  });

  it("should return parameter catalog with thresholds", () => {
    const params = service.getParameters();
    expect(params.length).toBeGreaterThan(0);
    const tempParam = params.find((p) => p.name === "temperature");
    expect(tempParam).toBeDefined();
    expect(tempParam?.warnHigh).toBeDefined();
  });
});
