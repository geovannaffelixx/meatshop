import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const REPORT_KINDS = [
  'finance',
  'payments',
  'orders',
  'deliveries',
  'catalog',
  'performance',
  'coupons',
  'promotions',
  'support',
  'reviews',
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export class ExportReportDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) unit_id: number;
  @ApiProperty({ enum: REPORT_KINDS }) @IsIn(REPORT_KINDS) report: ReportKind;
  @ApiProperty({ enum: ['xlsx', 'pdf', 'json'] }) @IsIn(['xlsx', 'pdf', 'json']) format:
    'xlsx' | 'pdf' | 'json';

  @ApiPropertyOptional() @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) date_from?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) date_to?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) scheduled_from?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) scheduled_to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) id?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['true', 'false']) active?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['all', 'pending', 'receivable', 'refunds', 'issues'])
  view?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) product_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['all', 'low', 'available', 'empty']) stock?: string;
}
