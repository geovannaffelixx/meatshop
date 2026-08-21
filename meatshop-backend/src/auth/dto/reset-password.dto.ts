import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de redefinição de senha enviado por e-mail ao usuário',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsString()
  token: string;

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