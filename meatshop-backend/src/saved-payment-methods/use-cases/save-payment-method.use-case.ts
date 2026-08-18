import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MercadoPagoService } from '../../payments/providers/mercadopago.service';
import { User } from '../../users/entities/user.entity';
import { SavePaymentMethodDto } from '../dtos/save-payment-method.dto';
import { SavedPaymentMethodResponseDto } from '../dtos/saved-payment-method-response.dto';
import { SavedPaymentMethod } from '../entities/saved-payment-method.entity';

@Injectable()
export class SavePaymentMethodUseCase {
  constructor(
    @InjectRepository(SavedPaymentMethod)
    private readonly savedPaymentMethodRepository: Repository<SavedPaymentMethod>,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  async execute(
    dto: SavePaymentMethodDto,
    currentUser: User,
  ): Promise<SavedPaymentMethodResponseDto> {
    const existingMethods = await this.savedPaymentMethodRepository.find({
      where: { user_id: currentUser.id },
    });

    const customerId = await this.resolveCustomerId(existingMethods, currentUser);
    const card = await this.mercadoPagoService.saveCard(customerId, dto.card_token_id);

    const shouldBeDefault = existingMethods.length === 0 || dto.is_default === true;
    if (shouldBeDefault) {
      await this.unsetCurrentDefault(currentUser.id);
    }

    const savedMethod = this.savedPaymentMethodRepository.create({
      user_id: currentUser.id,
      mp_card_id: card.cardId,
      mp_customer_id: customerId,
      brand: card.brand,
      last_four: card.lastFourDigits,
      holder_name: card.holderName,
      expiration_month: card.expirationMonth,
      expiration_year: card.expirationYear,
      is_default: shouldBeDefault,
    });

    const saved = await this.savedPaymentMethodRepository.save(savedMethod);
    return SavedPaymentMethodResponseDto.fromEntity(saved);
  }

  private async resolveCustomerId(
    existingMethods: SavedPaymentMethod[],
    currentUser: User,
  ): Promise<string> {
    if (existingMethods.length > 0) {
      return existingMethods[0].mp_customer_id;
    }
    return this.mercadoPagoService.createCustomer(currentUser.email, currentUser.name);
  }

  private async unsetCurrentDefault(userId: number): Promise<void> {
    await this.savedPaymentMethodRepository.update(
      { user_id: userId, is_default: true },
      { is_default: false },
    );
  }
}
