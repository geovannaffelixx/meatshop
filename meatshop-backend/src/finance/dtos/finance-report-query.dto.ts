import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches } from 'class-validator';

export class FinanceReportQueryDto {
  @ApiProperty({ description: 'Month in YYYY-MM format', example: '2026-08' })
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must use the YYYY-MM format' })
  month: string;

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
