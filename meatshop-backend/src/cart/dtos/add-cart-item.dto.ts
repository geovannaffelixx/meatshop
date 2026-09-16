import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({
    description: 'Product identifier to add to the cart',
    example: 42,
  })
  @IsNotEmpty()
  @IsInt()
  product_id: number;

  @ApiProperty({
    description: 'Product quantity to add to the cart',
    example: 2,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;
}
