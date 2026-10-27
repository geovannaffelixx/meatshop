import { IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';

export class UpdateOrderStatusDto {
  @ApiPropertyOptional({
    description: 'Customer code required to complete counter pickup',
    pattern: '^\\d{6}$',
  })
  @IsOptional()
  @Matches(/^\d{6}$/)
  code?: string;

  @ApiProperty({
    description: 'New order status',
    enum: OrderStatus,
    example: OrderStatus.PREPARING,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
