import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches } from 'class-validator';

export class FinanceReportQueryDto {
  @ApiProperty({ description: 'Mês no formato YYYY-MM', example: '2026-08' })
  @Matches(/^\d{4}-\d{2}$/, { message: 'month deve estar no formato YYYY-MM' })
  month: string;

  @ApiPropertyOptional({
    description:
      'Unidade a ser consultada. Obrigatório para SUPER_ADMIN; opcional para quem administra apenas uma unidade.',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unit_id?: number;
}
