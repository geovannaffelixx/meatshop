import { ApiProperty } from '@nestjs/swagger';
import { SavedPaymentMethod } from '../entities/saved-payment-method.entity';

export class SavedPaymentMethodResponseDto {
  @ApiProperty({ description: 'Id do cartão salvo', example: 1 })
  id: number;

  @ApiProperty({ description: 'Bandeira do cartão', example: 'visa' })
  brand: string;

  @ApiProperty({ description: 'Últimos 4 dígitos do cartão', example: '4242' })
  last_four: string;

  @ApiProperty({ description: 'Nome impresso no cartão', example: 'JOAO DA SILVA' })
  holder_name: string;

  @ApiProperty({ description: 'Mês de expiração (MM)', example: '08' })
  expiration_month: string;

  @ApiProperty({ description: 'Ano de expiração (AAAA)', example: '2030' })
  expiration_year: string;

  @ApiProperty({ description: 'Indica se é o cartão padrão do usuário', example: true })
  is_default: boolean;

  @ApiProperty({
    description: 'Data em que o cartão foi salvo',
    example: '2026-08-18T12:00:00.000Z',
  })
  created_at: Date;

  static fromEntity(entity: SavedPaymentMethod): SavedPaymentMethodResponseDto {
    const dto = new SavedPaymentMethodResponseDto();
    dto.id = entity.id;
    dto.brand = entity.brand;
    dto.last_four = entity.last_four;
    dto.holder_name = entity.holder_name;
    dto.expiration_month = entity.expiration_month;
    dto.expiration_year = entity.expiration_year;
    dto.is_default = entity.is_default;
    dto.created_at = entity.created_at;
    return dto;
  }

  static fromEntities(entities: SavedPaymentMethod[]): SavedPaymentMethodResponseDto[] {
    return entities.map((entity) => SavedPaymentMethodResponseDto.fromEntity(entity));
  }
}
