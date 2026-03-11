import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { TelemetryService } from './telemetry.service';

@WebSocketGateway({
  namespace: '/telemetry',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class TelemetryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelemetryGateway.name);
  private connectedClients = new Map<string, { userId: string; email: string }>();

  constructor(
    private jwtService: JwtService,
    private telemetryService: TelemetryService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`Client ${client.id}: no token, disconnecting`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      this.connectedClients.set(client.id, { userId: payload.sub, email: payload.email });
      this.logger.log(`Client connected: ${payload.email} (${client.id})`);

      // Send last known reading immediately on connect
      const latest = this.telemetryService.getLatest();
      if (latest) client.emit('telemetry', latest);

      // Send recent buffer for charts
      client.emit('telemetry:history', this.telemetryService.getBuffer(60));

    } catch {
      this.logger.warn(`Client ${client.id}: invalid token, disconnecting`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const info = this.connectedClients.get(client.id);
    this.logger.log(`Client disconnected: ${info?.email || 'unknown'} (${client.id})`);
    this.connectedClients.delete(client.id);
  }

  broadcastTelemetry(data: any): void {
    this.server.emit('telemetry', data);
  }

  broadcastAlert(alert: { type: string; message: string; value: number; param: string }): void {
    this.server.emit('telemetry:alert', { ...alert, timestamp: new Date().toISOString() });
  }

  broadcastEvent(event: any): void {
    this.server.emit('event', event);
  }

  get clientCount(): number {
    return this.connectedClients.size;
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket): void {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }
}
