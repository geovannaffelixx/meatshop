import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'Nova quantidade do item no carrinho',
    example: 3,
  })
  @IsInt()
  @Min(1)
  quantity: number;
}
