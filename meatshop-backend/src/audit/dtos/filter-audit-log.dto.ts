import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FilterAuditLogDto {
  @ApiPropertyOptional({ description: 'Filtra pelo usuário que executou a ação', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @ApiPropertyOptional({ description: 'Filtra pela entidade afetada', example: 'products' })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({ description: 'Filtra pela ação executada', example: 'UPDATE' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Página (default 1)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: 'Itens por página (default 20, máx 100)', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
