import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class FilterRecipesDto {
  @ApiPropertyOptional({ description: 'Filtra receitas de uma unidade', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unit_id?: number;

  @ApiPropertyOptional({ description: 'Filtra por tag/categoria', example: 'Bovino' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Filtra por status de ativação', example: 'true' })
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: 'true' | 'false';

  @ApiPropertyOptional({
    description:
      'Se true, ordena pela receita da semana mais recente primeiro (week_start <= agora)',
    example: 'true',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  current_week?: 'true' | 'false';
}
