import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Senha atual do usuário',
    example: 'Senha123!',
  })
  @IsNotEmpty()
  @IsString()
  current_password: string;

  @ApiProperty({
    description:
      'Nova senha do usuário (mínimo 8 caracteres, deve conter maiúscula, minúscula, número e caractere especial)',
    example: 'NovaSenha123!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must contain uppercase, lowercase, number and special character',
  })
  new_password: string;
}