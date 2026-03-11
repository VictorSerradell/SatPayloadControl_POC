import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AuthModule } from './modules/auth/auth.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { CommandsModule } from './modules/commands/commands.module';
import { EventsModule } from './modules/events/events.module';
import { SimulatorModule } from './modules/simulator/simulator.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) =>
              `${timestamp} [${String(context || 'App')}] ${level}: ${message}`),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log', level: 'error',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('DB_HOST', 'localhost'),
        port: cfg.get<number>('DB_PORT', 5432),
        username: cfg.get('DB_USERNAME', 'satuser'),
        password: cfg.get('DB_PASSWORD', 'satpass123'),
        database: cfg.get('DB_DATABASE', 'satpayload'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: cfg.get('DB_SYNC', 'true') === 'true',
        dropSchema: cfg.get('DB_DROP_SCHEMA', 'false') === 'true',
        logging: cfg.get('DB_LOGGING', 'false') === 'true',
        retryAttempts: 10,
        retryDelay: 3000,
        migrationsRun: false,
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => [{
        ttl: cfg.get<number>('THROTTLE_TTL', 60) * 1000,
        limit: cfg.get<number>('THROTTLE_LIMIT', 100),
      }],
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    TelemetryModule,
    CommandsModule,
    EventsModule,
    SimulatorModule,
  ],
})
export class AppModule {}
