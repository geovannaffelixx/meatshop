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
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { JoinChatRoomDto } from './dtos/join-chat-room.dto';
import { SendChatSocketMessageDto } from './dtos/send-chat-socket-message.dto';
import { ChatParticipantType } from './enums/chat-participant-type.enum';
import { ChatAuthorizationService } from './services/chat-authorization.service';
import { SendMessageUseCase } from './use-cases/send-message.use-case';

function roomName(orderId: number, participantType: ChatParticipantType): string {
  return `order:${orderId}:${participantType}`;
}

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*', credentials: true } })
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
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(token);
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new Error('User not found');
      }
      client.data.user = user;
    } catch (error) {
      this.logger.warn(`Chat connection rejected: ${(error as Error).message}`);
      client.emit('chat:error', { message: 'Unauthorized' });
      client.disconnect(true);
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

  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendChatSocketMessageDto,
  ): Promise<void> {
    try {
      const message = await this.sendMessageUseCase.execute(
        dto.order_id,
        { participant_type: dto.participant_type, message: dto.message },
        client.data.user,
      );

      const room = roomName(dto.order_id, dto.participant_type);
      this.server.to(room).emit('chat:message', message);
    } catch (error) {
      client.emit('chat:error', { message: (error as Error).message });
    }
  }

  private async loadOrder(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  private extractToken(client: Socket): string {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);

    if (!token) {
      throw new Error('Missing authentication token');
    }
    return token;
  }
}
