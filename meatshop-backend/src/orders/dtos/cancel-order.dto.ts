import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiProperty({
    description: 'Motivo do cancelamento do pedido',
    example: 'Cliente desistiu da compra',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  reason: string;
}
