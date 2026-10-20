import { Transform } from 'class-transformer';
import { IsNumber, IsLatitude, IsLongitude } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterUnitDetailsDto {
  @Transform(({ obj, key }) => obj[key]) @IsOptional() @IsNumber() @IsLatitude() latitude?: number;
  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({
    description: 'Butcher shop name',
    example: 'Joe Butcher Shop',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Unit CNPJ, containing exactly 14 digits',
    example: '12345678000199',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'cnpj must contain exactly 14 digits' })
  cnpj: string;

  @ApiProperty({
    description: 'City where the unit is located',
    example: 'Goiania',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  city: string;

  @ApiProperty({
    description: 'State code with 2 uppercase letters',
    example: 'GO',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'state must be a 2-letter uppercase UF' })
  state: string;

  @ApiProperty({ description: 'Unit postal code', example: '75000-000' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  zip_code: string;

  @ApiProperty({
    description: 'Street address',
    example: 'Development Street',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  street?: string;

  @ApiProperty({ description: 'Number', example: '320', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @ApiProperty({
    description: 'Complemento',
    example: 'Store 2',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @ApiProperty({
    description: 'District',
    example: 'Downtown',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string;
}
