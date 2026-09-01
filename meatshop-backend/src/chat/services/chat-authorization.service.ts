import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPerson } from '../../delivery/entities/delivery-person.entity';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Unit } from '../../units/entities/unit.entity';
import { UserUnit } from '../../units/entities/user-unit.entity';
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
    @InjectRepository(UserUnit)
    private readonly userUnitRepository: Repository<UserUnit>,
  ) {}

  /** Read access: identity check only. Closed orders can still have their history read. */
  async assertCanParticipate(
    order: Order,
    participantType: ChatParticipantType,
    currentUser: User,
  ): Promise<ChatChannel> {
    const unitAdminId = await this.getUnitAdminId(order);

    switch (participantType) {
      case ChatParticipantType.UNIT:
        if (currentUser.id === order.client_id) {
          return { senderId: currentUser.id, receiverId: unitAdminId };
        }
        await this.assertUnitRepresentative(order.unit_id, currentUser.id, unitAdminId);
        return { senderId: currentUser.id, receiverId: order.client_id };

      case ChatParticipantType.DELIVERY_PERSON: {
        const deliveryUserId = await this.getDeliveryPersonUserId(order);
        if (currentUser.id === order.client_id) {
          return { senderId: currentUser.id, receiverId: deliveryUserId };
        }
        if (currentUser.id === deliveryUserId) {
          return { senderId: currentUser.id, receiverId: order.client_id };
        }
        break;
      }

      case ChatParticipantType.UNIT_DELIVERY_PERSON: {
        const deliveryUserId = await this.getDeliveryPersonUserId(order);
        if (currentUser.id === deliveryUserId) {
          return { senderId: currentUser.id, receiverId: unitAdminId };
        }
        await this.assertUnitRepresentative(order.unit_id, currentUser.id, unitAdminId);
        return { senderId: currentUser.id, receiverId: deliveryUserId };
      }
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

  private async getUnitAdminId(order: Order): Promise<number> {
    const unit = await this.unitRepository.findOne({
      where: { id: order.unit_id },
    });
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

  private async assertUnitRepresentative(
    unitId: number,
    userId: number,
    unitAdminId: number,
  ): Promise<void> {
    if (userId === unitAdminId) return;

    const membership = await this.userUnitRepository.findOne({
      where: {
        unit_id: unitId,
        user_id: userId,
        status: UserUnitStatus.ACTIVE,
      },
    });
    if (!membership || membership.local_role === LocalRole.DELIVERY) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }
  }
}
