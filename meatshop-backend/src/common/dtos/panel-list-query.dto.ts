import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PanelListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsIn(['true']) paginated?: 'true';
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 10;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) search?: string;
}

export function searchPattern(value: string) {
  return `%${value.trim().replace(/[\\%_]/g, '\\$&')}%`;
}

export function paginatedResult<T>(
  data: T[],
  total: number,
  filters: { page: number; limit: number },
) {
  return {
    data,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}
