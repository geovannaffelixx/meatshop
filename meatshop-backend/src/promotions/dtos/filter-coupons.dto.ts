import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CouponType } from '../enums/coupon-type.enum';

export class FilterCouponsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: CouponType }) @IsOptional() @IsEnum(CouponType) type?: CouponType;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) unit_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() active?: boolean;
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
