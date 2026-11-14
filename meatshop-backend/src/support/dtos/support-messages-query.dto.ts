import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SupportMessagesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  before_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 30;
}
