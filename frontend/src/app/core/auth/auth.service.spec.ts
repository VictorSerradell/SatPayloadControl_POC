import { TestBed } from "@angular/core/testing";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); localStorage.clear(); });

  it("should be created", () => expect(service).toBeTruthy());

  it("should start unauthenticated", () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.user()).toBeNull();
  });

  it("should login and set signals", () => {
    const mockResponse = {
      accessToken: "mock-token",
      user: { id: "1", email: "admin@sat.dev", firstName: "Admin", lastName: "User", role: "admin" as const },
    };

    service.login({ email: "admin@sat.dev", password: "Admin1234!" }).subscribe();

    const req = httpMock.expectOne(req => req.url.includes("/auth/login"));
    req.flush(mockResponse);

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.user()?.email).toBe("admin@sat.dev");
    expect(service.isAdmin()).toBeTrue();
    expect(service.isOperator()).toBeTrue();
  });

  it("should identify viewer role correctly", () => {
    const token = "viewer-token";
    const user = { id: "3", email: "viewer@sat.dev", firstName: "Read", lastName: "Only", role: "viewer" as const };
    localStorage.setItem("sat_token", token);
    localStorage.setItem("sat_user", JSON.stringify(user));
    service["restoreSession"]();

    expect(service.isAdmin()).toBeFalse();
    expect(service.isOperator()).toBeFalse();
    expect(service.hasRole("viewer")).toBeTrue();
  });

  it("should logout and clear state", () => {
    localStorage.setItem("sat_token", "token");
    localStorage.setItem("sat_user", JSON.stringify({ id: "1", email: "x@x.com", role: "viewer" }));
    service.logout();
    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem("sat_token")).toBeNull();
  });
});
