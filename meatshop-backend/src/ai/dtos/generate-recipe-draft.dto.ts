import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GenerateRecipeDraftDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  unit_id: number;

  @ApiProperty({ example: 'Receita rápida de picanha para almoço em família' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  brief: string;

  @ApiPropertyOptional({ default: 4, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  servings?: number;

  @ApiPropertyOptional({ example: 'Bovina' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Produtos autorizados da unidade',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  product_ids?: number[];
}
