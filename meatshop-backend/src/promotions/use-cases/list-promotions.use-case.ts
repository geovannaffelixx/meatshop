import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilterPromotionsDto } from '../dtos/filter-promotions.dto';
import { Promotion } from '../entities/promotion.entity';

@Injectable()
export class ListPromotionsUseCase {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
  ) {}

  async execute(filters: FilterPromotionsDto): Promise<Promotion[]> {
    const where: Record<string, unknown> = {};
    if (filters.unit_id) where.unit_id = filters.unit_id;
    if (filters.product_id) where.product_id = filters.product_id;
    if (filters.active !== undefined) where.active = filters.active;

    return this.promotionRepository.find({ where, order: { id: 'ASC' } });
  }
}
