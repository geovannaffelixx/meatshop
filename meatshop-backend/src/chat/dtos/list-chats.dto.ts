import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListChatsDto {
  @IsOptional()
  @IsIn(['CLIENT', 'DELIVERY', 'UNIT'])
  profile?: 'CLIENT' | 'DELIVERY' | 'UNIT';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
