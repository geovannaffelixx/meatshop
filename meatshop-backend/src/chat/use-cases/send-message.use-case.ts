import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../../notifications/enums/notification-type.enum';
import { SendNotificationUseCase } from '../../notifications/use-cases/send-notification.use-case';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { ChatMessageResponseDto } from '../dtos/chat-message-response.dto';
import { SendMessageDto } from '../dtos/send-message.dto';
import { Chat } from '../entities/chat.entity';
import { ChatAuthorizationService } from '../services/chat-authorization.service';

@Injectable()
export class SendMessageUseCase {
  private readonly logger = new Logger(SendMessageUseCase.name);

  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly chatAuthorizationService: ChatAuthorizationService,
    private readonly sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  async execute(
    orderId: number,
    dto: SendMessageDto,
    currentUser: User,
  ): Promise<ChatMessageResponseDto> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const channel = await this.chatAuthorizationService.resolveChannelForSending(
      order,
      dto.participant_type,
      currentUser,
    );

    const chat = await this.chatRepository.save(
      this.chatRepository.create({
        order_id: orderId,
        sender_id: channel.senderId,
        receiver_id: channel.receiverId,
        participant_type: dto.participant_type,
        message: dto.message,
      }),
    );

    await this.sendNotificationUseCase
      .execute({
        user_id: channel.receiverId,
        message: `Nova mensagem sobre o pedido #${orderId}: ${dto.message}`,
        type: NotificationType.ORDER,
      })
      .catch((error) =>
        this.logger.warn(`Failed to notify chat receiver ${channel.receiverId}: ${error.message}`),
      );

    return ChatMessageResponseDto.fromEntity(chat);
  }
}
