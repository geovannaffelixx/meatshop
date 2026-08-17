import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({
    description: 'Nova quantidade em estoque do produto',
    example: 50,
  })
  @IsInt()
  @Min(0)
  quantity: number;
}
