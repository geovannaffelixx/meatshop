import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterUnitDetailsDto {
  @ApiProperty({ description: 'Nome do açougue', example: 'Açougue do Zé' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'CNPJ da unidade, contendo exatamente 14 dígitos numéricos',
    example: '12345678000199',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'cnpj must contain exactly 14 digits' })
  cnpj: string;

  @ApiProperty({ description: 'Cidade onde a unidade está localizada', example: 'Anápolis' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  city: string;

  @ApiProperty({ description: 'UF (sigla do estado) com 2 letras maiúsculas', example: 'GO' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'state must be a 2-letter uppercase UF' })
  state: string;

  @ApiProperty({ description: 'CEP da unidade', example: '75000-000' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  zip_code: string;

  @ApiProperty({
    description: 'Rua/logradouro',
    example: 'Rua Engenheiro Portela',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  street?: string;

  @ApiProperty({ description: 'Número', example: '320', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @ApiProperty({ description: 'Complemento', example: 'Loja 2', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @ApiProperty({ description: 'Bairro', example: 'Jundiaí', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string;
}
