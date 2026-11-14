import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiPropertyOptional({
    description: 'New product stock quantity',
    example: 50,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsOptional()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Quantity shown when the edit form was opened' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  expected_quantity?: number;

  @ApiPropertyOptional({
    description: 'Minimum stock quantity that triggers low-stock alerts',
    example: 10,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  min_quantity?: number;
}
