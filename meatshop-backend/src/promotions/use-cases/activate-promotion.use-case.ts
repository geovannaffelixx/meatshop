import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { SendPromotionNotificationUseCase } from '../../notifications/use-cases/send-promotion-notification.use-case';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { Promotion } from '../entities/promotion.entity';

@Injectable()
export class ActivatePromotionUseCase {
  private readonly logger = new Logger(ActivatePromotionUseCase.name);

  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly sendPromotionNotification: SendPromotionNotificationUseCase,
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

    if (promotion.active) return promotion;
    const result = await this.promotionRepository.update(
      { id: promotionId, active: false },
      { active: true, notification_sent_at: null },
    );
    const saved = await this.promotionRepository.findOneByOrFail({ id: promotionId });
    if (result.affected !== 1) return saved;
    await this.sendPromotionNotification
      .execute(saved)
      .catch((error: Error) =>
        this.logger.warn(
          `Promotion ${saved.id} was activated, but its audience could not be notified: ${error.message}`,
        ),
      );
    return saved;
  }
}
