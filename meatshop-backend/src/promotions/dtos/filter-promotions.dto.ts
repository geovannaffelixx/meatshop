import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FilterPromotionsDto {
  @ApiPropertyOptional({
    description: 'Filtra promoções pela unidade',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unit_id?: number;

  @ApiPropertyOptional({
    description: 'Filtra promoções pelo produto',
    example: 42,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  product_id?: number;

  @ApiPropertyOptional({
    description: 'Filtra promoções pelo status de ativação',
    example: 'true',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: 'true' | 'false';

  @ApiPropertyOptional() @IsOptional() @IsIn(['true']) marketplace?: 'true';
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 10, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}
