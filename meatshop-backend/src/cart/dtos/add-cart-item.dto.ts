import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({
    description: 'Identificador do produto a ser adicionado ao carrinho',
    example: 42,
  })
  @IsNotEmpty()
  @IsInt()
  product_id: number;

  @ApiProperty({
    description: 'Quantidade do produto a ser adicionada ao carrinho',
    example: 2,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;
}
