import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class UnitScopedQueryDto {
  @ApiPropertyOptional({
    description:
      'Unit to query. Required for SUPER_ADMIN and optional for users who manage only one unit.',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unit_id?: number;
}
