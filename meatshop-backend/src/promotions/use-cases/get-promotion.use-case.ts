import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from '../entities/promotion.entity';

@Injectable()
export class GetPromotionUseCase {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
  ) {}

  async execute(promotionId: number): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { id: promotionId },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    return promotion;
  }
}
