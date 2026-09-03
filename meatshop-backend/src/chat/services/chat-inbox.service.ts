import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DeliveryPerson } from '../../delivery/entities/delivery-person.entity';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Unit } from '../../units/entities/unit.entity';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { User } from '../../users/entities/user.entity';
import { ChatConversationResponseDto } from '../dtos/chat-conversation-response.dto';
import { ListChatsDto } from '../dtos/list-chats.dto';
import { Chat } from '../entities/chat.entity';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';

const CLOSED_STATUSES = [OrderStatus.DELIVERED, OrderStatus.CANCELLED];

@Injectable()
export class ChatInboxService {
  constructor(
    @InjectRepository(Chat) private readonly messages: Repository<Chat>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(UserUnit)
    private readonly memberships: Repository<UserUnit>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPeople: Repository<DeliveryPerson>,
  ) {}

  async list(user: User, query: ListChatsDto) {
    const conversations = await this.conversations(user);
    return this.page(conversations, query, conversations.length);
  }

  async unreadCount(user: User): Promise<{ count: number }> {
    const conversations = await this.conversations(user);
    return {
      count: conversations.reduce((total, item) => total + item.unread_count, 0),
    };
  }

  private async conversations(user: User): Promise<ChatConversationResponseDto[]> {
    const orders = await this.accessibleOrders(user);
    if (orders.length === 0) return [];
    const messages = await this.messages.find({
      where: { order_id: In(orders.map(({ id }) => id)) },
      relations: { sender: true, receiver: true },
      order: { sent_at: 'DESC' },
    });
    const orderById = new Map(orders.map((order) => [order.id, order]));
    const grouped = new Map<string, Chat[]>();
    for (const message of messages) {
      const order = orderById.get(message.order_id);
      if (!order || !this.canUseChannel(order, message.participant_type, user.id)) continue;
      const key = `${message.order_id}:${message.participant_type}`;
      grouped.set(key, [...(grouped.get(key) ?? []), message]);
    }
    return [...grouped.entries()]
      .map(([id, entries]) =>
        this.toConversation(id, entries, orderById.get(entries[0].order_id)!, user.id),
      )
      .sort((left, right) => right.last_message_at.getTime() - left.last_message_at.getTime());
  }

  private async accessibleOrders(user: User): Promise<Order[]> {
    const [adminUnits, memberships, person] = await Promise.all([
      this.units.find({ where: { admin_id: user.id }, select: { id: true } }),
      this.memberships.find({
        where: { user_id: user.id, status: UserUnitStatus.ACTIVE },
        select: { unit_id: true, local_role: true },
      }),
      this.deliveryPeople.findOne({
        where: { user_id: user.id },
        select: { id: true },
      }),
    ]);
    const unitIds = new Set(adminUnits.map(({ id }) => id));
    for (const membership of memberships) {
      if (membership.local_role !== LocalRole.DELIVERY) unitIds.add(membership.unit_id);
    }
    const where = [
      { client_id: user.id },
      ...(person ? [{ delivery_person_id: person.id }] : []),
      ...(unitIds.size > 0 ? [{ unit_id: In([...unitIds]) }] : []),
    ];
    return this.orders.find({
      where,
      relations: { client: true, unit: true, delivery_person: { user: true } },
      order: { updated_at: 'DESC' },
      take: 500,
    });
  }

  private canUseChannel(order: Order, type: ChatParticipantType, userId: number): boolean {
    const isClient = order.client_id === userId;
    const isDelivery = order.delivery_person?.user_id === userId;
    const isUnit = !isClient && !isDelivery;
    if (type === ChatParticipantType.UNIT) return isClient || isUnit;
    if (type === ChatParticipantType.DELIVERY_PERSON) return isClient || isDelivery;
    return isUnit || isDelivery;
  }

  private toConversation(
    id: string,
    entries: Chat[],
    order: Order,
    userId: number,
  ): ChatConversationResponseDto {
    const latest = entries[0];
    const opponentId = this.opponentId(order, latest.participant_type, userId);
    const participant = this.opponent(order, latest.participant_type, userId);
    return {
      id,
      order_id: order.id,
      participant_type: latest.participant_type,
      participant: {
        id: opponentId,
        name: participant.name,
        avatar_url: participant.avatarUrl,
      },
      last_message: latest.message,
      last_message_at: latest.sent_at,
      unread_count: entries.filter((message) => !message.read_at && message.sender_id !== userId)
        .length,
      closed: CLOSED_STATUSES.includes(order.status),
    };
  }

  private opponentId(order: Order, type: ChatParticipantType, userId: number): number {
    const deliveryUserId = order.delivery_person?.user_id;
    if (type === ChatParticipantType.UNIT) {
      return order.client_id === userId ? order.unit.admin_id : order.client_id;
    }
    if (type === ChatParticipantType.DELIVERY_PERSON) {
      return order.client_id === userId ? (deliveryUserId ?? 0) : order.client_id;
    }
    return deliveryUserId === userId ? order.unit.admin_id : (deliveryUserId ?? 0);
  }

  private opponentName(order: Order, type: ChatParticipantType, userId: number): string {
    if (type === ChatParticipantType.UNIT) {
      return order.client_id === userId ? order.unit.name : (order.client.name ?? 'Cliente');
    }
    if (type === ChatParticipantType.DELIVERY_PERSON) {
      return order.client_id === userId
        ? (order.delivery_person?.user?.name ?? 'Entregador')
        : (order.client.name ?? 'Cliente');
    }
    return order.delivery_person?.user_id === userId
      ? order.unit.name
      : (order.delivery_person?.user?.name ?? 'Entregador');
  }

  private opponent(
    order: Order,
    type: ChatParticipantType,
    userId: number,
  ): { name: string; avatarUrl: string | null } {
    const isClient = order.client_id === userId;
    const isDelivery = order.delivery_person?.user_id === userId;
    if (
      (type === ChatParticipantType.UNIT && isClient) ||
      (type === ChatParticipantType.UNIT_DELIVERY_PERSON && isDelivery)
    ) {
      return { name: order.unit.name, avatarUrl: null };
    }
    if (
      (type === ChatParticipantType.DELIVERY_PERSON && isClient) ||
      (type === ChatParticipantType.UNIT_DELIVERY_PERSON && !isDelivery)
    ) {
      return {
        name: order.delivery_person?.user?.name ?? 'Entregador',
        avatarUrl: order.delivery_person?.user?.avatar_url ?? null,
      };
    }
    return {
      name: order.client.name ?? 'Cliente',
      avatarUrl: order.client.avatar_url ?? null,
    };
  }

  private page(items: ChatConversationResponseDto[], query: ListChatsDto, total: number) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    return { items: items.slice(offset, offset + limit), page, limit, total };
  }
}
