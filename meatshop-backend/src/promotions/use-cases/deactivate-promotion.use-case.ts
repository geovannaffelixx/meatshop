import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { Promotion } from '../entities/promotion.entity';

@Injectable()
export class DeactivatePromotionUseCase {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(promotionId: number, currentUser: User): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { id: promotionId },
    });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    const unit = await this.unitRepository.findOne({ where: { id: promotion.unit_id } });
    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      promotion.unit_id,
      UnitPermission.MANAGE_PRODUCTS,
    );

    promotion.active = false;
    return this.promotionRepository.save(promotion);
  }
}
