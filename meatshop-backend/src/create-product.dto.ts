import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProductStatus } from './entities/product.entity';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cut: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsNotEmpty()
  quantity: string;

  @IsNumber()
  price: number;

  @IsNumber()
  @IsOptional()
  promotionalPrice?: number | null;

  @IsBoolean()
  @IsOptional()
  promotionActive?: boolean;

  @IsOptional()
  status?: ProductStatus;
}
