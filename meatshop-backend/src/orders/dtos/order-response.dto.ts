import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Payment } from '../entities/payment.entity';

export class OrderItemResponseDto {
  @ApiProperty({ description: 'Order item ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Product ID', example: 42 })
  product_id: number;

  @ApiProperty({ description: 'Product name', example: 'Beef Picanha' })
  product_name: string;

  @ApiProperty({ description: 'Unit of measure', example: 'kg' })
  unit_of_measure: string;

  @ApiPropertyOptional({ description: 'Product image', nullable: true })
  product_image_url: string | null;

  @ApiProperty({ description: 'Product quantity in the order', example: 2 })
  quantity: number;

  @ApiProperty({
    description: 'Product unit price at the time of the order',
    example: 59.9,
  })
  unit_price: number;

  static fromEntity(item: OrderItem): OrderItemResponseDto {
    const dto = new OrderItemResponseDto();
    dto.id = item.id;
    dto.product_id = item.product_id;
    dto.product_name = item.product?.name;
    dto.unit_of_measure = item.product?.unit_of_measure ?? 'un';
    dto.product_image_url = item.product?.image_url ?? null;
    dto.quantity = item.quantity;
    dto.unit_price = Number(item.unit_price);
    return dto;
  }
}

export class OrderResponseDto {
  @ApiProperty({ description: 'Order ID', example: 1001 })
  id: number;

  @ApiProperty({
    description: 'ID of the customer who placed the order',
    example: 15,
  })
  client_id: number;

  @ApiPropertyOptional({
    description: 'Name of the customer who placed the order',
    example: 'John Smith',
    nullable: true,
  })
  client_name: string | null;

  @ApiProperty({
    description: 'ID of the unit responsible for the order',
    example: 3,
  })
  unit_id: number;

  @ApiPropertyOptional({ description: 'Unit name', nullable: true })
  unit_name: string | null;

  @ApiPropertyOptional({ description: 'Logo da unit', nullable: true })
  unit_logo_url: string | null;

  @ApiPropertyOptional({
    description: 'ID of the delivery person responsible for the order, when assigned',
    example: 7,
    nullable: true,
  })
  delivery_person_id: number | null;

  @ApiProperty({
    description: 'Order creation date and time',
    example: '2026-08-17T12:00:00.000Z',
  })
  order_date: Date;

  @ApiProperty({ description: 'Current order status', example: 'PENDING' })
  status: string;

  @ApiPropertyOptional({
    description: 'Current order delivery status, when applicable',
    example: 'ON_THE_WAY',
    nullable: true,
  })
  delivery_status: string | null;

  @ApiPropertyOptional({
    description: 'Current order delivery stage, when applicable',
    example: 'DELIVERING',
    nullable: true,
  })
  delivery_step: string | null;

  @ApiProperty({
    description: 'Total order amount including fees and discounts',
    example: 129.9,
  })
  total_amount: number;

  @ApiProperty({
    description: 'Order subtotal including items without fees or discounts',
    example: 119.9,
  })
  subtotal: number;

  @ApiProperty({
    description: 'Discount amount applied to the order',
    example: 10,
  })
  discount_amount: number;

  @ApiProperty({
    description: 'Order delivery fee',
    example: 8,
  })
  delivery_fee: number;

  @ApiPropertyOptional({
    description: 'ID of the delivery address used for the order, when applicable',
    example: 12,
    nullable: true,
  })
  address_id: number | null;

  @ApiPropertyOptional({
    description: 'ID of the discount coupon applied to the order, when available',
    example: 5,
    nullable: true,
  })
  coupon_id: number | null;

  @ApiProperty({
    description: 'Order delivery type',
    example: 'DELIVERY',
  })
  delivery_type: string;

  @ApiProperty({
    description: 'Current order payment status',
    example: 'PAID',
  })
  payment_status: string;

  checkout_id: string | null;
  payment_due_at: Date | null;
  change_for: number | null;

  @ApiProperty({
    description: 'Indicates whether the order has a scheduled delivery date',
    example: false,
  })
  is_scheduled: boolean;

  @ApiPropertyOptional({
    description: 'Scheduled order delivery date and time, when scheduled',
    example: '2026-08-20T18:00:00.000Z',
    nullable: true,
  })
  scheduled_delivery_date: Date | null;

  @ApiPropertyOptional({
    description: 'Order cancellation reason, when canceled',
    example: 'Customer desistiu da compra',
    nullable: true,
  })
  cancellation_reason: string | null;

  @ApiPropertyOptional({
    description: 'Date and time when the order was canceled, when applicable',
    example: '2026-08-18T09:30:00.000Z',
    nullable: true,
  })
  cancelled_at: Date | null;

  @ApiPropertyOptional({
    description: 'Who canceled the order (customer, unit, or system), when applicable',
    example: 'CLIENT',
    nullable: true,
  })
  cancelled_by: string | null;

  @ApiProperty({
    description: 'Items included in the order',
    type: () => OrderItemResponseDto,
    isArray: true,
  })
  items: OrderItemResponseDto[];

  @ApiPropertyOptional({
    description: 'Payment information associated with the order, when available',
    example: {
      method: 'Pix',
      status: 'PAID',
      payment_date: '2026-08-17T12:05:00.000Z',
    },
    nullable: true,
  })
  payment: {
    method: string | null;
    status: string;
    payment_date: Date | null;
    refunded_amount: number;
    fee_amount: number;
    refund_status: string | null;
    receipt_reference: string | null;
  } | null;

  @ApiPropertyOptional({
    description: 'Code visible only to the customer who owns the order while valid',
    nullable: true,
  })
  delivery_code: string | null;

  static fromEntity(
    order: Order,
    items: OrderItem[],
    payment: Payment | null,
    deliveryCode: string | null = null,
  ): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = order.id;
    dto.client_id = order.client_id;
    dto.client_name = order.client?.name ?? null;
    dto.unit_id = order.unit_id;
    dto.unit_name = order.unit?.name ?? null;
    dto.unit_logo_url = order.unit?.image_url ?? null;
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
    dto.checkout_id = order.checkout_id;
    dto.payment_due_at = order.payment_due_at;
    dto.change_for = order.change_for == null ? null : Number(order.change_for);
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
          refunded_amount: Number(payment.refunded_amount ?? 0),
          fee_amount: Number(payment.fee_amount ?? 0),
          refund_status: payment.refund_status,
          receipt_reference: payment.receipt_reference,
        }
      : null;
    dto.delivery_code = deliveryCode;
    return dto;
  }
}
