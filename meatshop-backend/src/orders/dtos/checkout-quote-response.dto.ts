import { ApiProperty } from '@nestjs/swagger';

export class CheckoutQuoteItemDto {
  product_id: number;
  product_name: string;
  product_image_url: string | null;
  unit_of_measure: string;
  unit_price: number;
  quantity: number;
  unit_id: number;
  unit_name: string;
  unit_image_url: string | null;
}

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

  @ApiProperty({ type: CheckoutQuoteItemDto, isArray: true }) items?: CheckoutQuoteItemDto[];
}

export class CheckoutQuoteResponseDto {
  @ApiProperty() quote_token: string;
  @ApiProperty() quote_expires_at: string;
  @ApiProperty({ type: CheckoutQuoteGroupDto, isArray: true })
  groups: CheckoutQuoteGroupDto[];

  @ApiProperty({ example: 149.8 })
  total_amount: number;
}
