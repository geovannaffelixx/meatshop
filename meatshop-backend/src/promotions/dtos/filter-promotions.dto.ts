import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class FilterPromotionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unit_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  product_id?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}
