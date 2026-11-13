import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
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
  ): Promise<
    | ChatMessageResponseDto[]
    | { items: ChatMessageResponseDto[]; has_more: boolean; next_before_id: number | null }
  > {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    await this.chatAuthorizationService.assertCanParticipate(
      order,
      query.participant_type,
      currentUser,
    );

    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const messages = await this.chatRepository.find({
      where: {
        order_id: orderId,
        participant_type: query.participant_type,
        ...(query.before_id ? { id: LessThan(query.before_id) } : {}),
      },
      relations: ['sender', 'receiver'],
      order: query.paginated === 'true' ? { id: 'DESC' } : { sent_at: 'DESC', id: 'DESC' },
      skip: query.before_id ? 0 : (page - 1) * limit,
      take: query.paginated === 'true' ? limit + 1 : limit,
    });

    if (query.paginated === 'true') {
      const batch = messages.slice(0, limit);
      return {
        items: ChatMessageResponseDto.fromEntities([...batch].reverse()),
        has_more: messages.length > limit,
        next_before_id: batch.length ? batch[batch.length - 1].id : null,
      };
    }
    return ChatMessageResponseDto.fromEntities(messages.reverse());
  }
}
