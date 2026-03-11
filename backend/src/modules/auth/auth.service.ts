import {
  Injectable, UnauthorizedException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email, isActive: true } });
    if (!user || !(await user.validatePassword(dto.password))) {
      this.logger.warn(`Failed login attempt for: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    this.logger.log(`User logged in: ${user.email} (${user.role})`);

    return {
      accessToken,
      user: {
        id: user.id, email: user.email,
        firstName: user.firstName, lastName: user.lastName, role: user.role,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const user = this.userRepo.create(dto);
    await this.userRepo.save(user);
    this.logger.log(`New user registered: ${user.email} (${user.role})`);

    return { message: 'User registered successfully', userId: user.id };
  }

  async getProfile(userId: string) {
    return this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'createdAt'],
    });
  }

  async seedDefaultUsers() {
    const count = await this.userRepo.count();
    if (count > 0) return;

    this.logger.log('Seeding default users...');
    const users = [
      { email: 'admin@sat.dev', password: 'Admin1234!', firstName: 'Admin', lastName: 'User', role: 'admin' },
      { email: 'operator@sat.dev', password: 'Operator1234!', firstName: 'Ground', lastName: 'Operator', role: 'operator' },
      { email: 'viewer@sat.dev', password: 'Viewer1234!', firstName: 'Read', lastName: 'Only', role: 'viewer' },
    ];

    for (const u of users) {
      const user = this.userRepo.create(u as any);
      await this.userRepo.save(user);
    }
    this.logger.log('Default users seeded: admin@sat.dev / operator@sat.dev / viewer@sat.dev');
  }
}
