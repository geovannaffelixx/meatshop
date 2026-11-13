import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import type { User } from '../../users/entities/user.entity';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';
import { ChatAuthorizationService } from '../services/chat-authorization.service';
import { chatParticipant } from '../services/chat-participant';

@Injectable()
export class GetChatParticipantUseCase {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly access: ChatAuthorizationService,
  ) {}

  async execute(orderId: number, channel: ChatParticipantType, user: User) {
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: { unit: true, client: true, delivery_person: { user: true } },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    await this.access.assertCanParticipate(order, channel, user);
    return chatParticipant(order, channel, user.id);
  }
}
