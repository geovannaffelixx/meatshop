import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SaveDeliveryExpenseDto {
  @IsIn(['FUEL', 'MAINTENANCE', 'PARKING', 'TOLL', 'INSURANCE', 'OTHER'])
  category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0.01)
  @Max(9999999999.99)
  amount: number;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  incurred_on: string;
}

export class ListDeliveryExpensesDto {
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;
}
