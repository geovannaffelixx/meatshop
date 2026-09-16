import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AuditOutcome } from '../entities/audit-log.entity';

export class FilterAuditLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unit_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() entity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entity_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() action?: string;
  @ApiPropertyOptional({ enum: AuditOutcome })
  @IsOptional()
  @IsEnum(AuditOutcome)
  outcome?: AuditOutcome;

  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date_from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date_to?: string;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
