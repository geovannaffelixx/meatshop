import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCouponDto } from './create-coupon.dto';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateCouponDto extends PartialType(
  OmitType(CreateCouponDto, [
    'code',
    'maximum_discount',
    'total_usage_limit',
    'usage_limit_per_user',
  ] as const),
) {
  @IsOptional() @IsNumber() @Min(0.01) maximum_discount?: number | null;
  @IsOptional() @IsInt() @Min(1) total_usage_limit?: number | null;
  @IsOptional() @IsInt() @Min(1) usage_limit_per_user?: number | null;
}
