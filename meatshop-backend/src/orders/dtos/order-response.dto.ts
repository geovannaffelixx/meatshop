import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Payment } from '../entities/payment.entity';

export class OrderItemResponseDto {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;

  static fromEntity(item: OrderItem): OrderItemResponseDto {
    const dto = new OrderItemResponseDto();
    dto.id = item.id;
    dto.product_id = item.product_id;
    dto.product_name = item.product?.name;
    dto.quantity = item.quantity;
    dto.unit_price = Number(item.unit_price);
    return dto;
  }
}

export class OrderResponseDto {
  id: number;
  client_id: number;
  unit_id: number;
  delivery_person_id: number | null;
  order_date: Date;
  status: string;
  delivery_status: string | null;
  delivery_step: string | null;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  address_id: number | null;
  coupon_id: number | null;
  delivery_type: string;
  payment_status: string;
  is_scheduled: boolean;
  scheduled_delivery_date: Date | null;
  cancellation_reason: string | null;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  items: OrderItemResponseDto[];
  payment: { method: string | null; status: string; payment_date: Date | null } | null;

  static fromEntity(
    order: Order,
    items: OrderItem[],
    payment: Payment | null,
  ): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = order.id;
    dto.client_id = order.client_id;
    dto.unit_id = order.unit_id;
    dto.delivery_person_id = order.delivery_person_id;
    dto.order_date = order.order_date;
    dto.status = order.status;
    dto.delivery_status = order.delivery_status;
    dto.delivery_step = order.delivery_step;
    dto.total_amount = Number(order.total_amount);
    dto.subtotal = Number(order.subtotal);
    dto.discount_amount = Number(order.discount_amount);
    dto.delivery_fee = Number(order.delivery_fee);
    dto.address_id = order.address_id;
    dto.coupon_id = order.coupon_id;
    dto.delivery_type = order.delivery_type;
    dto.payment_status = order.payment_status;
    dto.is_scheduled = order.is_scheduled;
    dto.scheduled_delivery_date = order.scheduled_delivery_date;
    dto.cancellation_reason = order.cancellation_reason;
    dto.cancelled_at = order.cancelled_at;
    dto.cancelled_by = order.cancelled_by;
    dto.items = items.map((item) => OrderItemResponseDto.fromEntity(item));
    dto.payment = payment
      ? {
          method: payment.method,
          status: payment.status,
          payment_date: payment.payment_date,
        }
      : null;
    return dto;
  }
}
