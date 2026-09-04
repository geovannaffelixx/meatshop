import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra pela unidade ativa e notificações globais',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unit_id?: number;

  @ApiPropertyOptional({
    description: 'Filtra por lidas (true) ou não lidas (false)',
    example: 'false',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  read?: 'true' | 'false';

  @ApiPropertyOptional({ description: 'Página (1-based)', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Itens por página (1 a 100)', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
