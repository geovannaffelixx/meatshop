import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({
    description: 'Nova quantidade em estoque do produto',
    example: 50,
  })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({
    description:
      'Quantidade mínima em estoque a partir da qual o produto passa a aparecer nos alertas de estoque baixo',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  min_quantity?: number;
}
