import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class FilterRecipesDto {
  @ApiPropertyOptional({ description: 'Filters recipes by unit', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unit_id?: number;

  @ApiPropertyOptional({
    description: 'Filters by tag or category',
    example: 'Beef',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Filters by activation status',
    example: 'true',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: 'true' | 'false';

  @ApiPropertyOptional({
    description: 'When true, sorts by the most recent recipe of the week first (week_start <= now)',
    example: 'true',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  current_week?: 'true' | 'false';
}
