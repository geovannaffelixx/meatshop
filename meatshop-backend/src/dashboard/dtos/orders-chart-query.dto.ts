import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { UnitScopedQueryDto } from './unit-scoped-query.dto';

export class OrdersChartQueryDto extends UnitScopedQueryDto {
  @ApiPropertyOptional({
    description: 'Quantidade de dias retroativos a incluir no gráfico (1 a 90)',
    example: 7,
    default: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;
}
