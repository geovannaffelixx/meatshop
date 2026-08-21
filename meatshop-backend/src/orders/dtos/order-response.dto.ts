import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Payment } from '../entities/payment.entity';

export class OrderItemResponseDto {
  @ApiProperty({ description: 'Id do item do pedido', example: 1 })
  id: number;

  @ApiProperty({ description: 'Id do produto', example: 42 })
  product_id: number;

  @ApiProperty({ description: 'Nome do produto', example: 'Picanha Bovina' })
  product_name: string;

  @ApiProperty({ description: 'Quantidade do produto no pedido', example: 2 })
  quantity: number;

  @ApiProperty({ description: 'Preço unitário do produto no momento do pedido', example: 59.9 })
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
  @ApiProperty({ description: 'Id do pedido', example: 1001 })
  id: number;

  @ApiProperty({ description: 'Id do cliente que fez o pedido', example: 15 })
  client_id: number;

  @ApiProperty({ description: 'Id da unidade responsável pelo pedido', example: 3 })
  unit_id: number;

  @ApiPropertyOptional({
    description: 'Id do entregador responsável pelo pedido, quando já atribuído',
    example: 7,
    nullable: true,
  })
  delivery_person_id: number | null;

  @ApiProperty({ description: 'Data e hora em que o pedido foi criado', example: '2026-08-17T12:00:00.000Z' })
  order_date: Date;

  @ApiProperty({ description: 'Status atual do pedido', example: 'PENDING' })
  status: string;

  @ApiPropertyOptional({
    description: 'Status atual da entrega do pedido, quando aplicável',
    example: 'ON_THE_WAY',
    nullable: true,
  })
  delivery_status: string | null;

  @ApiPropertyOptional({
    description: 'Etapa atual da entrega do pedido, quando aplicável',
    example: 'DELIVERING',
    nullable: true,
  })
  delivery_step: string | null;

  @ApiProperty({ description: 'Valor total do pedido, incluindo taxas e descontos', example: 129.9 })
  total_amount: number;

  @ApiProperty({ description: 'Subtotal do pedido, somando os itens sem taxas ou descontos', example: 119.9 })
  subtotal: number;

  @ApiProperty({ description: 'Valor de desconto aplicado ao pedido', example: 10 })
  discount_amount: number;

  @ApiProperty({ description: 'Valor da taxa de entrega do pedido', example: 8 })
  delivery_fee: number;

  @ApiPropertyOptional({
    description: 'Id do endereço de entrega utilizado no pedido, quando aplicável',
    example: 12,
    nullable: true,
  })
  address_id: number | null;

  @ApiPropertyOptional({
    description: 'Id do cupom de desconto aplicado ao pedido, quando houver',
    example: 5,
    nullable: true,
  })
  coupon_id: number | null;

  @ApiProperty({ description: 'Tipo de entrega do pedido', example: 'DELIVERY' })
  delivery_type: string;

  @ApiProperty({ description: 'Status atual do pagamento do pedido', example: 'PAID' })
  payment_status: string;

  @ApiProperty({ description: 'Indica se o pedido possui data de entrega agendada', example: false })
  is_scheduled: boolean;

  @ApiPropertyOptional({
    description: 'Data e hora agendada para a entrega do pedido, quando agendado',
    example: '2026-08-20T18:00:00.000Z',
    nullable: true,
  })
  scheduled_delivery_date: Date | null;

  @ApiPropertyOptional({
    description: 'Motivo do cancelamento do pedido, quando cancelado',
    example: 'Cliente desistiu da compra',
    nullable: true,
  })
  cancellation_reason: string | null;

  @ApiPropertyOptional({
    description: 'Data e hora em que o pedido foi cancelado, quando aplicável',
    example: '2026-08-18T09:30:00.000Z',
    nullable: true,
  })
  cancelled_at: Date | null;

  @ApiPropertyOptional({
    description: 'Quem realizou o cancelamento do pedido (cliente, unidade ou sistema), quando aplicável',
    example: 'CLIENT',
    nullable: true,
  })
  cancelled_by: string | null;

  @ApiProperty({
    description: 'Itens que compõem o pedido',
    type: () => OrderItemResponseDto,
    isArray: true,
  })
  items: OrderItemResponseDto[];

  @ApiPropertyOptional({
    description: 'Informações de pagamento associadas ao pedido, quando existentes',
    example: { method: 'Pix', status: 'PAID', payment_date: '2026-08-17T12:05:00.000Z' },
    nullable: true,
  })
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
