import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Promotion } from '../entities/promotion.entity';

@Injectable()
export class GetPromotionUseCase {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
  ) {}

  async execute(promotionId: number): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: {
        id: promotionId,
        active: true,
        starts_at: LessThanOrEqual(new Date()),
        ends_at: MoreThanOrEqual(new Date()),
        unit: { is_active: true },
        product: { active: true, category: { active: true } },
      },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    return promotion;
  }
}
