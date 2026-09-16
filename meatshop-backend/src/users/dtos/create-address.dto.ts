import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AddressLabel } from '../../common/enums/address-label.enum';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Street or avenue name',
    example: 'Flower Street',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  street: string;

  @ApiProperty({
    description: 'Property number',
    example: '123',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  number: string;

  @ApiPropertyOptional({
    description: 'Address details',
    example: 'Apto 45',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @ApiProperty({
    description: 'Address district',
    example: 'Downtown',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  neighborhood: string;

  @ApiProperty({
    description: 'Address city',
    example: 'Sao Paulo',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  city: string;

  @ApiProperty({
    description: 'State code',
    example: 'SP',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2)
  state: string;

  @ApiProperty({
    description: 'Address postal code',
    example: '01310-100',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  zip_code: string;

  @ApiProperty({
    description: 'Address label/category',
    example: AddressLabel.HOME,
    enum: AddressLabel,
  })
  @IsEnum(AddressLabel)
  label: AddressLabel;

  @ApiPropertyOptional({
    description: 'Indicates whether this is the user default address',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
