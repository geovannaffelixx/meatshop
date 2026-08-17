import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePromotionDto {
  @IsNotEmpty()
  @IsInt()
  unit_id: number;

  @IsNotEmpty()
  @IsInt()
  product_id: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateIf((dto) => dto.promotional_price === undefined)
  @IsNotEmpty({ message: 'Either discount_percentage or promotional_price is required' })
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percentage?: number;

  @ValidateIf((dto) => dto.discount_percentage === undefined)
  @IsNotEmpty({ message: 'Either discount_percentage or promotional_price is required' })
  @IsNumber()
  @Min(0)
  promotional_price?: number;

  @IsNotEmpty()
  @IsDateString()
  starts_at: string;

  @IsNotEmpty()
  @IsDateString()
  ends_at: string;
}
