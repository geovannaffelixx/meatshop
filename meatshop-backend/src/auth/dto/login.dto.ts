import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  usuario: string;

  @IsString()
  @MinLength(6)
  senha: string;

  @IsOptional()
  @IsString()
  cnpj?: string;
}
