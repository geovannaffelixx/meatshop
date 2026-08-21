import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class UnitScopedQueryDto {
  @ApiPropertyOptional({
    description:
      'Unidade a ser consultada. Obrigatório para SUPER_ADMIN; opcional para quem administra apenas uma unidade.',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unit_id?: number;
}
