import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MercadoPagoService } from '../../payments/providers/mercadopago.service';
import { User } from '../../users/entities/user.entity';
import { SavedPaymentMethod } from '../entities/saved-payment-method.entity';

@Injectable()
export class DeletePaymentMethodUseCase {
  constructor(
    @InjectRepository(SavedPaymentMethod)
    private readonly savedPaymentMethodRepository: Repository<SavedPaymentMethod>,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  async execute(id: number, currentUser: User): Promise<void> {
    const method = await this.savedPaymentMethodRepository.findOne({
      where: { id, user_id: currentUser.id },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    await this.mercadoPagoService.removeCard(method.mp_customer_id, method.mp_card_id);
    await this.savedPaymentMethodRepository.remove(method);

    if (method.is_default) {
      await this.promoteAnotherMethodToDefault(currentUser.id);
    }
  }

  private async promoteAnotherMethodToDefault(userId: number): Promise<void> {
    const remaining = await this.savedPaymentMethodRepository.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });

    if (remaining) {
      remaining.is_default = true;
      await this.savedPaymentMethodRepository.save(remaining);
    }
  }
}
