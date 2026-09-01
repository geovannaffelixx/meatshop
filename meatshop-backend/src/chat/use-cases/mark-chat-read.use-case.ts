import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { ChatReadResponseDto } from '../dtos/chat-read-response.dto';
import { Chat } from '../entities/chat.entity';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';
import { ChatAuthorizationService } from '../services/chat-authorization.service';

@Injectable()
export class MarkChatReadUseCase {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly chatAuthorizationService: ChatAuthorizationService,
  ) {}

  async execute(
    orderId: number,
    participantType: ChatParticipantType,
    currentUser: User,
  ): Promise<ChatReadResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const channel = await this.chatAuthorizationService.assertCanParticipate(
      order,
      participantType,
      currentUser,
    );
    const readAt = new Date();
    const result = await this.chatRepository
      .createQueryBuilder()
      .update(Chat)
      .set({ read_at: readAt })
      .where('order_id = :orderId', { orderId })
      .andWhere('participant_type = :participantType', { participantType })
      .andWhere('read_at IS NULL')
      .andWhere('(receiver_id = :readerId OR sender_id = :opponentId)', {
        readerId: currentUser.id,
        opponentId: channel.receiverId,
      })
      .execute();

    return {
      order_id: orderId,
      participant_type: participantType,
      reader_id: currentUser.id,
      updated_count: result.affected ?? 0,
      read_at: readAt,
    };
  }
}
