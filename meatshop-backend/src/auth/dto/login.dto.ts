import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  usuario: string;

  @IsString()
  @MinLength(8)
  senha: string;

  @IsOptional()
  @IsString()
  cnpj?: string;
}
