import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Order } from '../entities/order.entity';

export class OrderListItemDto {
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

  @ApiProperty({ description: 'Order delivery type', example: 'DELIVERY' })
  delivery_type: string;

  @ApiProperty({ description: 'Current order payment status', example: 'PAID' })
  payment_status: string;

  @ApiProperty({ description: 'Total order amount', example: 129.9 })
  total_amount: number;

  @ApiPropertyOptional({
    description: 'Scheduled order delivery date and time, when scheduled',
    example: '2026-08-20T18:00:00.000Z',
    nullable: true,
  })
  scheduled_delivery_date: Date | null;

  static fromEntity(order: Order): OrderListItemDto {
    const dto = new OrderListItemDto();
    dto.id = order.id;
    dto.client_id = order.client_id;
    dto.client_name = order.client?.name ?? null;
    dto.unit_id = order.unit_id;
    dto.order_date = order.order_date;
    dto.status = order.status;
    dto.delivery_status = order.delivery_status;
    dto.delivery_type = order.delivery_type;
    dto.payment_status = order.payment_status;
    dto.total_amount = Number(order.total_amount);
    dto.scheduled_delivery_date = order.scheduled_delivery_date;
    return dto;
  }
}
