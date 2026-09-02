import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsEnum, Matches } from 'class-validator';
import { AppProfile } from '../../common/enums/app-profile.enum';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/)
  cpf?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10,11}$/)
  phone?: string;

  @IsOptional()
  @IsEnum(AppProfile)
  app_profile?: AppProfile;
}
