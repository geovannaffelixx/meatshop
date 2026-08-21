import { BadRequestException, Injectable } from '@nestjs/common';
import { DeliveryType } from '../enums/delivery-type.enum';
import { OrderStatus } from '../enums/order-status.enum';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrderStatusTransitionValidator {
  assertValid(
    from: OrderStatus,
    to: OrderStatus,
    deliveryType: DeliveryType,
  ): void {
    if (from === OrderStatus.READY && to === OrderStatus.OUT_FOR_DELIVERY && deliveryType === DeliveryType.PICKUP) {
      throw new BadRequestException(
        'Pickup orders go straight from READY to DELIVERED',
      );
    }

    if (from === OrderStatus.READY && to === OrderStatus.DELIVERED && deliveryType === DeliveryType.DELIVERY) {
      throw new BadRequestException(
        'Delivery orders must go through OUT_FOR_DELIVERY before DELIVERED',
      );
    }

    if (!TRANSITIONS[from]?.includes(to)) {
      throw new BadRequestException(`Cannot transition order from ${from} to ${to}`);
    }
  }
}
