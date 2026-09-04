import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { Promotion } from '../entities/promotion.entity';

@Injectable()
export class ActivatePromotionUseCase {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(promotionId: number, currentUser: User): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { id: promotionId },
    });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      promotion.unit_id,
      UnitPermission.MANAGE_PRODUCTS,
    );

    promotion.active = true;
    return this.promotionRepository.save(promotion);
  }
}
