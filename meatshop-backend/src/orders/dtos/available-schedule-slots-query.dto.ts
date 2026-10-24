import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Matches,
  Min,
} from 'class-validator';

export class AvailableScheduleSlotsQueryDto {
  @Transform(({ value }) =>
    String(value)
      .split(',')
      .map((item) => Number(item.trim())),
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  unit_ids: number[];

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;
}
