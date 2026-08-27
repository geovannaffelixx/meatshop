import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { NotificationResponseDto } from './dtos/notification-response.dto';
import { Notification } from './entities/notification.entity';

const USER_ROOM_PREFIX = 'user:';

@WebSocketGateway({ namespace: '/notifications', cors: { origin: true, credentials: true } })
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(this.extractToken(client));
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user) throw new Error('User not found');

      client.data.userId = user.id;
      await client.join(`${USER_ROOM_PREFIX}${user.id}`);
    } catch (error) {
      this.logger.warn(`Notifications connection rejected: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  emitToUser(notification: Notification): void {
    this.server
      .to(`${USER_ROOM_PREFIX}${notification.user_id}`)
      .emit('notification:new', NotificationResponseDto.fromEntity(notification));
  }

  private extractToken(client: Socket): string {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    const cookieHeader = client.handshake.headers.cookie ?? '';
    const accessCookie = cookieHeader
      .split(';')
      .map((cookie: string): string[] => cookie.trim().split('='))
      .find((parts: string[]) => parts[0] === 'access_token');

    if (!accessCookie?.[1]) throw new Error('Missing authentication token');
    return decodeURIComponent(accessCookie.slice(1).join('='));
  }
}
