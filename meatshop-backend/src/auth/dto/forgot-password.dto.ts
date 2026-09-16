import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address where the password reset link will be sent',
    example: 'customer@meatshop.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
