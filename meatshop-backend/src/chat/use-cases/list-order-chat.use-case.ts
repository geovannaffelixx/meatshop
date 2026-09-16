import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { ChatMessageResponseDto } from '../dtos/chat-message-response.dto';
import { ListChatMessagesDto } from '../dtos/list-chat-messages.dto';
import { Chat } from '../entities/chat.entity';
import { ChatAuthorizationService } from '../services/chat-authorization.service';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

@Injectable()
export class ListOrderChatUseCase {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly chatAuthorizationService: ChatAuthorizationService,
  ) {}

  async execute(
    orderId: number,
    query: ListChatMessagesDto,
    currentUser: User,
  ): Promise<ChatMessageResponseDto[]> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.chatAuthorizationService.assertCanParticipate(
      order,
      query.participant_type,
      currentUser,
    );

    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const messages = await this.chatRepository.find({
      where: { order_id: orderId, participant_type: query.participant_type },
      relations: ['sender', 'receiver'],
      order: { sent_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return ChatMessageResponseDto.fromEntities(messages.reverse());
  }
}
