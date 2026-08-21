import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SavedPaymentMethodResponseDto } from '../dtos/saved-payment-method-response.dto';
import { SavedPaymentMethod } from '../entities/saved-payment-method.entity';

@Injectable()
export class SetDefaultPaymentMethodUseCase {
  constructor(
    @InjectRepository(SavedPaymentMethod)
    private readonly savedPaymentMethodRepository: Repository<SavedPaymentMethod>,
  ) {}

  async execute(id: number, currentUser: User): Promise<SavedPaymentMethodResponseDto> {
    const method = await this.savedPaymentMethodRepository.findOne({
      where: { id, user_id: currentUser.id },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    if (!method.is_default) {
      await this.savedPaymentMethodRepository.update(
        { user_id: currentUser.id, is_default: true },
        { is_default: false },
      );
      method.is_default = true;
      await this.savedPaymentMethodRepository.save(method);
    }

    return SavedPaymentMethodResponseDto.fromEntity(method);
  }
}
