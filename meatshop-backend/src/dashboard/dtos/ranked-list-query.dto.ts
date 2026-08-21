import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { UnitScopedQueryDto } from './unit-scoped-query.dto';

export class RankedListQueryDto extends UnitScopedQueryDto {
  @ApiPropertyOptional({
    description: 'Quantidade máxima de itens a retornar (1 a 50)',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
