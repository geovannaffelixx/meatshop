import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'User current password',
    example: 'Senha123!',
  })
  @IsNotEmpty()
  @IsString()
  current_password: string;

  @ApiProperty({
    description:
      'User new password (minimum 8 characters, including uppercase, lowercase, number, and special character)',
    example: 'NovaSenha123!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  new_password: string;
}
