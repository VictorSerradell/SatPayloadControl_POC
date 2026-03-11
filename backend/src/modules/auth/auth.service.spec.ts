import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { User, UserRole } from "./entities/user.entity";

const mockUser: Partial<User> = {
  id: "uuid-1", email: "admin@sat.dev",
  role: UserRole.ADMIN, isActive: true,
  firstName: "Admin", lastName: "User",
  validatePassword: jest.fn().mockResolvedValue(true),
};

const mockRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn().mockResolvedValue(1),
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue("mock-jwt-token") } },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("login", () => {
    it("should return access token on valid credentials", async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.login({ email: "admin@sat.dev", password: "Admin1234!" });
      expect(result.accessToken).toBe("mock-jwt-token");
      expect(result.user.email).toBe("admin@sat.dev");
    });

    it("should throw UnauthorizedException on invalid credentials", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.login({ email: "wrong@sat.dev", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when password is wrong", async () => {
      const userWithWrongPass = { ...mockUser, validatePassword: jest.fn().mockResolvedValue(false) };
      mockRepo.findOne.mockResolvedValue(userWithWrongPass);
      await expect(
        service.login({ email: "admin@sat.dev", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("register", () => {
    it("should throw ConflictException if email exists", async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      await expect(
        service.register({ email: "admin@sat.dev", password: "pass", firstName: "X", lastName: "Y", role: UserRole.VIEWER }),
      ).rejects.toThrow(ConflictException);
    });

    it("should create user if email is new", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({ id: "new-uuid", email: "new@sat.dev" });
      mockRepo.save.mockResolvedValue({ id: "new-uuid" });
      const result = await service.register({
        email: "new@sat.dev", password: "Pass1234!", firstName: "New", lastName: "User", role: UserRole.VIEWER,
      });
      expect(result.userId).toBe("new-uuid");
    });
  });
});
