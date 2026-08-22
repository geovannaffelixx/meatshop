import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({
    description: 'Nome da unidade',
    example: 'Loja Centro',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'CNPJ da unidade, contendo exatamente 14 digitos numericos',
    example: '12345678000199',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'cnpj must contain exactly 14 digits' })
  cnpj: string;

  @ApiProperty({
    description: 'Cidade onde a unidade esta localizada',
    example: 'Goiania',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  city: string;

  @ApiProperty({
    description: 'CEP da unidade',
    example: '74000-000',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  zip_code: string;

  @ApiProperty({
    description: 'UF (sigla do estado) com 2 letras maiusculas',
    example: 'GO',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'state must be a 2-letter uppercase UF' })
  state: string;

  @ApiProperty({ required: false, example: 'Rua das Flores' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  street?: string;

  @ApiProperty({ required: false, example: '123' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @ApiProperty({ required: false, example: 'Sala 2' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @ApiProperty({ required: false, example: 'Centro' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string;
}
