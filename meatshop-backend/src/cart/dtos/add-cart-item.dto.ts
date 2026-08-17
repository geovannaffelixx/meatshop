import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

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
  @IsInt()
  @Min(1)
  quantity: number;
}
