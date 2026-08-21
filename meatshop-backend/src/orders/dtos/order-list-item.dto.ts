import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Order } from '../entities/order.entity';

export class OrderListItemDto {
  @ApiProperty({ description: 'Id do pedido', example: 1001 })
  id: number;

  @ApiProperty({ description: 'Id do cliente que fez o pedido', example: 15 })
  client_id: number;

  @ApiPropertyOptional({
    description: 'Nome do cliente que fez o pedido',
    example: 'João da Silva',
    nullable: true,
  })
  client_name: string | null;

  @ApiProperty({ description: 'Id da unidade responsável pelo pedido', example: 3 })
  unit_id: number;

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

  @ApiProperty({ description: 'Tipo de entrega do pedido', example: 'DELIVERY' })
  delivery_type: string;

  @ApiProperty({ description: 'Status atual do pagamento do pedido', example: 'PAID' })
  payment_status: string;

  @ApiProperty({ description: 'Valor total do pedido', example: 129.9 })
  total_amount: number;

  @ApiPropertyOptional({
    description: 'Data e hora agendada para a entrega do pedido, quando agendado',
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
