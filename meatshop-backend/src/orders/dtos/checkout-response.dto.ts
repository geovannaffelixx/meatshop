import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';

export class CheckoutResponseDto {
  @ApiProperty({ format: 'uuid' })
  checkout_id: string;

  @ApiProperty({ type: OrderResponseDto, isArray: true })
  orders: OrderResponseDto[];

  @ApiProperty({ example: 149.8 })
  total_amount: number;
}
