import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Nome do produto',
    example: 'Picanha',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Descrição detalhada do produto',
    example: 'Corte bovino nobre, ideal para churrasco',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Preço de venda do produto',
    example: 89.9,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Unidade de medida do produto',
    example: 'KG',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  unit_of_measure: string;

  @ApiPropertyOptional({
    description: 'Indica se o produto está ativo',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Identificador da unidade à qual o produto pertence',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  unit_id: number;

  @ApiProperty({
    description: 'Identificador da categoria à qual o produto pertence',
    example: 3,
  })
  @IsNotEmpty()
  @IsInt()
  category_id: number;

  @ApiPropertyOptional({
    description: 'Marca do produto',
    example: 'Friboi',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({
    description: 'URL da imagem do produto',
    example: 'https://cdn.example.com/produtos/picanha.jpg',
  })
  @IsOptional()
  @IsUrl()
  image_url?: string;
}
