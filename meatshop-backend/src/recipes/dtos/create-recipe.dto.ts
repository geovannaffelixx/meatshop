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
  @ApiProperty({
    description: 'ID of the unit publishing the recipe',
    example: 1,
  })
  @IsInt()
  unit_id: number;

  @ApiProperty({ description: 'Recipe title', example: 'Grilled Picanha' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({
    description: 'Recipe description or tagline',
    example:
      'The queen of Brazilian barbecue. With the right technique, you get a perfect crust and a juicy center.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Recipe cover image URL' })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @ApiPropertyOptional({
    description: 'Recipe video URL (for example, YouTube)',
  })
  @IsOptional()
  @IsUrl()
  video_url?: string;

  @ApiPropertyOptional({
    description: 'Recipe display tag/category',
    example: 'Beef',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @ApiPropertyOptional({
    description: 'Whether the recipe is visible in the app',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Display order among unit recipes',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Start date of the week when the recipe is featured as recipe of the week',
  })
  @IsOptional()
  @IsDateString()
  week_start?: string;

  @ApiProperty({
    description: 'Preparation steps in sequence',
    type: () => CreateRecipeStepDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  steps: CreateRecipeStepDto[];

  @ApiProperty({
    description: 'Recipe ingredients',
    type: () => CreateRecipeIngredientDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients: CreateRecipeIngredientDto[];

  @ApiPropertyOptional({
    description: 'Catalog products featured in the recipe',
    type: () => CreateRecipeProductDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeProductDto)
  products?: CreateRecipeProductDto[];
}
