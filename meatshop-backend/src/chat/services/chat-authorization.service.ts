import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPerson } from '../../delivery/entities/delivery-person.entity';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Unit } from '../../units/entities/unit.entity';
import { User } from '../../users/entities/user.entity';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';

export type ChatChannel = {
  senderId: number;
  receiverId: number;
};

const CLOSED_STATUSES = [OrderStatus.DELIVERED, OrderStatus.CANCELLED];

@Injectable()
export class ChatAuthorizationService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
  ) {}

  /** Read access: identity check only. Closed orders can still have their history read. */
  async assertCanParticipate(
    order: Order,
    participantType: ChatParticipantType,
    currentUser: User,
  ): Promise<ChatChannel> {
    const [partyA, partyB] = await this.resolveParticipants(order, participantType);

    if (currentUser.id === partyA) {
      return { senderId: partyA, receiverId: partyB };
    }
    if (currentUser.id === partyB) {
      return { senderId: partyB, receiverId: partyA };
    }

    throw new ForbiddenException('You are not a participant of this conversation');
  }

  /** Write access: identity check plus the order must not be in a terminal status. */
  async resolveChannelForSending(
    order: Order,
    participantType: ChatParticipantType,
    currentUser: User,
  ): Promise<ChatChannel> {
    if (CLOSED_STATUSES.includes(order.status)) {
      throw new BadRequestException('Chat is closed for this order');
    }
    return this.assertCanParticipate(order, participantType, currentUser);
  }

  /** Returns the two user ids allowed in this channel, order-independent. */
  private async resolveParticipants(
    order: Order,
    participantType: ChatParticipantType,
  ): Promise<[number, number]> {
    switch (participantType) {
      case ChatParticipantType.UNIT:
        return [order.client_id, await this.getUnitAdminId(order)];
      case ChatParticipantType.DELIVERY_PERSON:
        return [order.client_id, await this.getDeliveryPersonUserId(order)];
      case ChatParticipantType.UNIT_DELIVERY_PERSON:
        return [await this.getUnitAdminId(order), await this.getDeliveryPersonUserId(order)];
    }
  }

  private async getUnitAdminId(order: Order): Promise<number> {
    const unit = await this.unitRepository.findOne({ where: { id: order.unit_id } });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    return unit.admin_id;
  }

  private async getDeliveryPersonUserId(order: Order): Promise<number> {
    if (!order.delivery_person_id) {
      throw new BadRequestException('This order has no delivery person assigned yet');
    }
    const deliveryPerson = await this.deliveryPersonRepository.findOne({
      where: { id: order.delivery_person_id },
    });
    if (!deliveryPerson) {
      throw new NotFoundException('Delivery person not found');
    }
    return deliveryPerson.user_id;
  }
}
