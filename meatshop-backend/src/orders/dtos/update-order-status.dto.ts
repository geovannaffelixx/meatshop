import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'Novo status do pedido',
    enum: OrderStatus,
    example: OrderStatus.PREPARING,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
