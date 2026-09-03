import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { JoinChatRoomDto } from './dtos/join-chat-room.dto';
import { SendChatSocketMessageDto } from './dtos/send-chat-socket-message.dto';
import { ChatParticipantType } from './enums/chat-participant-type.enum';
import { ChatMessageResponseDto } from './dtos/chat-message-response.dto';
import { ChatReadResponseDto } from './dtos/chat-read-response.dto';
import { ChatTypingDto } from './dtos/chat-typing.dto';
import { ChatAuthorizationService } from './services/chat-authorization.service';
import { SendMessageUseCase } from './use-cases/send-message.use-case';
import { AuditTrailService } from '../audit/audit-trail.service';
import { AuditOutcome } from '../audit/entities/audit-log.entity';

function roomName(orderId: number, participantType: ChatParticipantType): string {
  return `order:${orderId}:${participantType}`;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(','),
    credentials: true,
  },
})
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly chatAuthorizationService: ChatAuthorizationService,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly auditTrail: AuditTrailService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user?.is_active) {
        throw new Error('User not found or inactive');
      }
      client.data.user = user;
      client.emit('chat:ready', { user_id: user.id });
    } catch (error) {
      this.logger.warn(`Chat connection rejected: ${(error as Error).message}`);
      client.emit('chat:error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('chat:leave')
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinChatRoomDto,
  ): Promise<void> {
    await client.leave(roomName(dto.order_id, dto.participant_type));
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ChatTypingDto,
  ): Promise<void> {
    try {
      this.assertThrottle(client, 'typing', 250);
      const order = await this.loadOrder(dto.order_id);
      await this.chatAuthorizationService.assertCanParticipate(
        order,
        dto.participant_type,
        client.data.user,
      );
      client.to(roomName(dto.order_id, dto.participant_type)).emit('chat:typing', {
        order_id: dto.order_id,
        participant_type: dto.participant_type,
        user_id: (client.data.user as User).id,
        typing: Boolean(dto.typing),
      });
    } catch (error) {
      client.emit('chat:error', { message: (error as Error).message });
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinChatRoomDto,
  ): Promise<void> {
    try {
      const order = await this.loadOrder(dto.order_id);
      await this.chatAuthorizationService.assertCanParticipate(
        order,
        dto.participant_type,
        client.data.user,
      );

      const room = roomName(dto.order_id, dto.participant_type);
      await client.join(room);
      client.emit('chat:joined', { room });
    } catch (error) {
      client.emit('chat:error', { message: (error as Error).message });
    }
  }

  emitMessage(message: ChatMessageResponseDto): void {
    this.server
      .to(roomName(message.order_id, message.participant_type))
      .emit('chat:message', message);
  }

  emitReadReceipt(receipt: ChatReadResponseDto): void {
    this.server.to(roomName(receipt.order_id, receipt.participant_type)).emit('chat:read', receipt);
  }

  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendChatSocketMessageDto,
  ): Promise<ChatMessageResponseDto | void> {
    try {
      this.assertThrottle(client, 'send', 400);
      const message = await this.sendMessageUseCase.execute(
        dto.order_id,
        { participant_type: dto.participant_type, message: dto.message },
        client.data.user,
      );

      const room = roomName(dto.order_id, dto.participant_type);
      this.server.to(room).emit('chat:message', message);
      await this.recordSocketEvent(client, dto.order_id, AuditOutcome.SUCCESS);
      return message;
    } catch (error) {
      await this.recordSocketEvent(client, dto.order_id, AuditOutcome.FAILURE);
      client.emit('chat:error', { message: (error as Error).message });
    }
  }

  private async recordSocketEvent(
    client: Socket,
    orderId: number,
    outcome: AuditOutcome,
  ): Promise<void> {
    const user = client.data.user as User | undefined;
    await this.auditTrail.safeRecord({
      action: 'CHAT_MESSAGE_SENT',
      entity: 'chats',
      entityId: String(orderId),
      description: `Envio de mensagem no chat do pedido ${outcome === AuditOutcome.SUCCESS ? 'realizado' : 'falhou'}`,
      outcome,
      userId: user?.id ?? null,
      actorType: user ? 'USER' : 'ANONYMOUS',
      path: '/chat:send',
      method: 'WS',
      ipAddress: client.handshake.address,
      userAgent: client.handshake.headers['user-agent'] ?? null,
    });
  }

  private async loadOrder(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
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

  private assertThrottle(client: Socket, action: string, intervalMs: number): void {
    const now = Date.now();
    const key = `chat:${action}`;
    const previous = Number(client.data[key] ?? 0);
    if (now - previous < intervalMs) throw new WsException('Too many realtime events');
    client.data[key] = now;
  }
}
