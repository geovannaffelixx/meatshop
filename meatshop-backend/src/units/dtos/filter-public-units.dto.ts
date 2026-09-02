import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class FilterPublicUnitsDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLatitude() lat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLongitude() lng?: number;
  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(500)
  radius_km?: number;
}
