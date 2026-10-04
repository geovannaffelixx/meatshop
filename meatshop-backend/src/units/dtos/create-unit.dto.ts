import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsLatitude, IsLongitude, IsNumber, Min, Max } from 'class-validator';

export class CreateUnitDto {
  @Transform(({ obj, key }) => obj[key]) @IsOptional() @IsNumber() @IsLatitude() latitude?: number;
  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @IsOptional() @IsNumber() @Min(0.1) @Max(500) delivery_radius_km?: number;

  @ApiProperty({
    description: 'Unit name',
    example: 'Downtown Store',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Unit CNPJ containing exactly 14 digits',
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
    description: 'Unit postal code',
    example: '74000-000',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  zip_code: string;

  @ApiProperty({
    description: 'State code with 2 uppercase letters',
    example: 'GO',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'state must be a 2-letter uppercase UF' })
  state: string;

  @ApiProperty({ required: false, example: 'Flower Street' })
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

  @ApiProperty({ required: false, example: 'Downtown' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string;
}
