import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, Matches } from 'class-validator';

export const DELIVERY_REPORTS = [
  'earnings',
  'history',
  'expenses',
  'financial',
  'settlements',
  'personal',
  'support',
] as const;
export type DeliveryReportKind = (typeof DELIVERY_REPORTS)[number];

export class DeliveryExportDto {
  @ApiProperty({ enum: DELIVERY_REPORTS }) @IsIn(DELIVERY_REPORTS) report: DeliveryReportKind;
  @ApiProperty({ enum: ['xlsx', 'pdf'] }) @IsIn(['xlsx', 'pdf']) format: 'xlsx' | 'pdf';
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['all', 'received', 'pending']) payment?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['FUEL', 'MAINTENANCE', 'PARKING', 'TOLL', 'INSURANCE', 'OTHER'])
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['OPEN', 'ANSWERED', 'WAITING_SUPPORT', 'WAITING_USER', 'CLOSED'])
  status?: string;
}
