import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CouponDiscountType } from '../enums/coupon-discount-type.enum';
import { CouponType } from '../enums/coupon-type.enum';

export class CreateCouponDto {
  @ApiProperty({ example: 'MEATSHOP10' })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Boas-vindas' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiProperty({ enum: CouponType }) @IsEnum(CouponType) type: CouponType;
  @ApiPropertyOptional()
  @ValidateIf((dto) => dto.type === CouponType.UNIT)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unit_id?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  allowed_unit_ids?: number[];

  @ApiProperty({ enum: CouponDiscountType })
  @IsEnum(CouponDiscountType)
  discount_type: CouponDiscountType;

  @ApiProperty({ example: 10 }) @Type(() => Number) @IsNumber() @Min(0.01) discount_amount: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  maximum_discount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimum_order_value?: number;

  @ApiProperty() @IsDateString() starts_at: string;
  @ApiProperty() @IsDateString() expires_at: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  total_usage_limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usage_limit_per_user?: number;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() active?: boolean;
}
