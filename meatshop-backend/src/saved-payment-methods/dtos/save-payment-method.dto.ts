import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SavePaymentMethodDto {
  @ApiProperty({
    description:
      'Token do cartão gerado pelo SDK do Mercado Pago no cliente (Card Token). O número, CVV e validade do cartão nunca devem ser enviados diretamente ao backend.',
    example: 'ff8080814c8dd1230...',
  })
  @IsNotEmpty()
  @IsString()
  card_token_id: string;

  @ApiPropertyOptional({
    description: 'Define este cartão como o método de pagamento padrão do usuário',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
