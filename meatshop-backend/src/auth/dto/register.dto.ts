import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AppProfile } from '../../common/enums/app-profile.enum';

export class RegisterDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Smith',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'customer@meatshop.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User CPF (digits only or formatted)',
    example: '12345678900',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(11)
  @MaxLength(14)
  cpf: string;

  @ApiProperty({
    description:
      'User password (minimum 8 characters, including uppercase, lowercase, number, and special character)',
    example: 'Senha123!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({
    description: 'User access role in the application',
    example: AppProfile.CLIENT,
    enum: AppProfile,
  })
  @IsEnum(AppProfile)
  app_profile: AppProfile;
}
