import { TestBed } from "@angular/core/testing";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { TelemetryService } from "./telemetry.service";
import { AuthService } from "../auth/auth.service";
import { TelemetryData } from "./telemetry.models";

const mockAuthService = {
  getToken: jest.fn().mockReturnValue("mock-token"),
  isAuthenticated: jest.fn().mockReturnValue(true),
};

const mockTelemetry: TelemetryData = {
  timestamp: new Date().toISOString(),
  temperature: 32.5, voltage: 28.4, current: 1200, power: 34.08,
  sensorPointing: 45.0, instrumentMode: "ON", signalStrength: -72,
  dataRate: 1024, batteryLevel: 85,
};

describe("TelemetryService", () => {
  let service: TelemetryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TelemetryService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    service = TestBed.inject(TelemetryService);
  });

  it("should be created", () => expect(service).toBeTruthy());

  it("should start with null telemetry", () => {
    expect(service.latest()).toBeNull();
    expect(service.connected()).toBeFalse();
  });

  it("should compute temperature status as warning at 52°C", () => {
    service.latest.set({ ...mockTelemetry, temperature: 52 });
    expect(service.tempStatus()).toBe("warning");
  });

  it("should compute temperature status as critical at 72°C", () => {
    service.latest.set({ ...mockTelemetry, temperature: 72 });
    expect(service.tempStatus()).toBe("critical");
  });

  it("should compute temperature status as nominal at 30°C", () => {
    service.latest.set({ ...mockTelemetry, temperature: 30 });
    expect(service.tempStatus()).toBe("nominal");
  });

  it("should compute mode status as critical on ERROR", () => {
    service.latest.set({ ...mockTelemetry, instrumentMode: "ERROR" });
    expect(service.modeStatus()).toBe("critical");
  });

  it("should dismiss an alert", () => {
    service.alerts.set([
      { type: "WARNING", param: "temperature", value: 51, message: "temp warn", timestamp: "t1" },
      { type: "CRITICAL", param: "power", value: 56, message: "power crit", timestamp: "t2" },
    ]);
    service.dismissAlert(0);
    expect(service.alerts().length).toBe(1);
    expect(service.alerts()[0].param).toBe("power");
  });
});
