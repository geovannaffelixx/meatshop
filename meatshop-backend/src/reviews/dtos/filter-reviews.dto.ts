import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class FilterReviewsDto {
  @ApiPropertyOptional({ description: 'Filtra avaliações pela unidade', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unit_id?: number;

  @ApiPropertyOptional({ description: 'Filtra avaliações pelo produto', example: 42 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  product_id?: number;
}
