import { ApiProperty } from '@nestjs/swagger';

export class CheckoutQuoteGroupDto {
  @ApiProperty({ example: 3 })
  unit_id: number;

  @ApiProperty({ example: 119.9 })
  subtotal: number;

  @ApiProperty({ example: 10 })
  discount_amount: number;

  @ApiProperty({ example: 8 })
  delivery_fee: number;

  @ApiProperty({ example: 117.9 })
  total_amount: number;
}

export class CheckoutQuoteResponseDto {
  @ApiProperty({ type: CheckoutQuoteGroupDto, isArray: true })
  groups: CheckoutQuoteGroupDto[];

  @ApiProperty({ example: 149.8 })
  total_amount: number;
}
