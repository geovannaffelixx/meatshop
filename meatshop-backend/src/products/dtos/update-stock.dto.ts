import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({
    description: 'New product stock quantity',
    example: 50,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Minimum stock quantity that triggers low-stock alerts',
    example: 10,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  min_quantity?: number;
}
