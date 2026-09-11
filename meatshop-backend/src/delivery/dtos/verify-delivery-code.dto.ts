import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class VerifyDeliveryCodeDto {
  @ApiProperty({
    example: '482193',
    description: 'Six-digit numeric code',
  })
  @Matches(/^\d{6}$/, { message: 'code must contain exactly 6 digits' })
  code: string;
}
