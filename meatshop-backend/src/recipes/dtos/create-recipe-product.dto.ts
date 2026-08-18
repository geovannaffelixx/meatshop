import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRecipeProductDto {
  @ApiProperty({ description: 'Id do produto do catálogo em destaque na receita', example: 42 })
  @IsInt()
  product_id: number;

  @ApiProperty({
    description: 'Texto de chamada para ação, incentivando a compra do produto',
    example: 'Use nossa Picanha Bovina Frigorífico Nobre para essa receita!',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  call_to_action: string;
}
