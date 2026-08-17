import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateCouponDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;

  @ValidateIf((dto) => dto.discount_value === undefined)
  @IsNotEmpty({ message: 'Either discount_percentage or discount_value is required' })
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percentage?: number;

  @ValidateIf((dto) => dto.discount_percentage === undefined)
  @IsNotEmpty({ message: 'Either discount_percentage or discount_value is required' })
  @IsNumber()
  @Min(0)
  discount_value?: number;

  @IsNotEmpty()
  @IsDateString()
  expires_at: string;

  @IsOptional()
  active?: boolean;
}
