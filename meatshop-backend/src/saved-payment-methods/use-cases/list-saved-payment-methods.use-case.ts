import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SavedPaymentMethodResponseDto } from '../dtos/saved-payment-method-response.dto';
import { SavedPaymentMethod } from '../entities/saved-payment-method.entity';

@Injectable()
export class ListSavedPaymentMethodsUseCase {
  constructor(
    @InjectRepository(SavedPaymentMethod)
    private readonly savedPaymentMethodRepository: Repository<SavedPaymentMethod>,
  ) {}

  async execute(currentUser: User): Promise<SavedPaymentMethodResponseDto[]> {
    const methods = await this.savedPaymentMethodRepository.find({
      where: { user_id: currentUser.id },
      order: { is_default: 'DESC', created_at: 'DESC' },
    });

    return SavedPaymentMethodResponseDto.fromEntities(methods);
  }
}
