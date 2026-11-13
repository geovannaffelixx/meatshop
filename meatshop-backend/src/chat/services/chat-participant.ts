import type { Order } from '../../orders/entities/order.entity';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';

export function chatParticipant(order: Order, channel: ChatParticipantType, userId: number) {
  const isClient = order.client_id === userId;
  const isDelivery = order.delivery_person?.user_id === userId;
  if (
    (channel === ChatParticipantType.UNIT && isClient) ||
    (channel === ChatParticipantType.UNIT_DELIVERY_PERSON && isDelivery)
  ) {
    return {
      id: order.unit.admin_id,
      name: order.unit.name,
      avatar_url: order.unit.image_url ?? null,
      type: 'UNIT' as const,
    };
  }
  if (
    (channel === ChatParticipantType.DELIVERY_PERSON && isClient) ||
    (channel === ChatParticipantType.UNIT_DELIVERY_PERSON && !isDelivery)
  ) {
    return {
      id: order.delivery_person?.user_id ?? 0,
      name: order.delivery_person?.user?.name ?? 'Entregador',
      avatar_url: order.delivery_person?.user?.avatar_url ?? null,
      type: 'DELIVERY' as const,
    };
  }
  return {
    id: order.client_id,
    name: order.client.name ?? 'Cliente',
    avatar_url: order.client.avatar_url ?? null,
    type: 'CLIENT' as const,
  };
}
