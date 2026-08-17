import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AddressLabel } from '../../common/enums/address-label.enum';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Nome da rua ou avenida',
    example: 'Rua das Flores',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  street: string;

  @ApiProperty({
    description: 'Número do imóvel',
    example: '123',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  number: string;

  @ApiPropertyOptional({
    description: 'Complemento do endereço',
    example: 'Apto 45',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @ApiProperty({
    description: 'Bairro do endereço',
    example: 'Centro',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  neighborhood: string;

  @ApiProperty({
    description: 'Cidade do endereço',
    example: 'São Paulo',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  city: string;

  @ApiProperty({
    description: 'Sigla do estado (UF)',
    example: 'SP',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2)
  state: string;

  @ApiProperty({
    description: 'CEP do endereço',
    example: '01310-100',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  zip_code: string;

  @ApiProperty({
    description: 'Rótulo/categoria do endereço',
    example: AddressLabel.HOME,
    enum: AddressLabel,
  })
  @IsEnum(AddressLabel)
  label: AddressLabel;

  @ApiPropertyOptional({
    description: 'Indica se este é o endereço padrão do usuário',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
