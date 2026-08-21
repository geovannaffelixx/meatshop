import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nome da categoria',
    example: 'Carnes Bovinas',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da categoria',
    example: 'Cortes bovinos frescos e resfriados',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: 'Indica se a categoria está ativa',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Identificador da unidade à qual a categoria pertence',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  unit_id: number;
}
