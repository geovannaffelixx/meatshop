import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateRecipeIngredientDto } from './create-recipe-ingredient.dto';
import { CreateRecipeProductDto } from './create-recipe-product.dto';
import { CreateRecipeStepDto } from './create-recipe-step.dto';

export class CreateRecipeDto {
  @ApiProperty({ description: 'Id da unidade que está publicando a receita', example: 1 })
  @IsInt()
  unit_id: number;

  @ApiProperty({ description: 'Título da receita', example: 'Picanha na Brasa' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    description: 'Descrição/chamada da receita',
    example:
      'A rainha do churrasco brasileiro. Com a técnica certa, você garante uma crosta perfeita por fora e suculência total por dentro.',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'URL da imagem de capa da receita' })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @ApiPropertyOptional({ description: 'URL do vídeo da receita (ex: YouTube)' })
  @IsOptional()
  @IsUrl()
  video_url?: string;

  @ApiPropertyOptional({ description: 'Tag/categoria de exibição da receita', example: 'Bovino' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @ApiPropertyOptional({ description: 'Se a receita está visível no app', example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Ordem de exibição entre as receitas da unidade', example: 1 })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Data de início da semana em que a receita é destacada como "receita da semana"',
  })
  @IsOptional()
  @IsDateString()
  week_start?: string;

  @ApiProperty({
    description: 'Passos do modo de preparo, em ordem',
    type: () => CreateRecipeStepDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  steps: CreateRecipeStepDto[];

  @ApiProperty({
    description: 'Ingredientes da receita',
    type: () => CreateRecipeIngredientDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients: CreateRecipeIngredientDto[];

  @ApiPropertyOptional({
    description: 'Produtos do catálogo em destaque na receita',
    type: () => CreateRecipeProductDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeProductDto)
  products?: CreateRecipeProductDto[];
}
