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
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  street: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  number: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  neighborhood: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  city: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2)
  state: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  zip_code: string;

  @IsEnum(AddressLabel)
  label: AddressLabel;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
