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

  async execute(
    filters: FilterPromotionsDto,
  ): Promise<Promotion[] | { data: Promotion[]; meta: Record<string, number> }> {
    if (filters.marketplace === 'true') {
      const query = this.promotionRepository
        .createQueryBuilder('promotion')
        .innerJoinAndSelect('promotion.product', 'product', 'product.active = :productActive', {
          productActive: true,
        })
        .innerJoinAndSelect('promotion.unit', 'unit')
        .innerJoin('product.category', 'category', 'category.active = :categoryActive', {
          categoryActive: true,
        })
        .innerJoin('stock', 'stock', 'stock.product_id = product.id AND stock.quantity > 0')
        .where('promotion.active = :active', { active: true })
        .andWhere('promotion.starts_at <= :now AND promotion.ends_at >= :now', { now: new Date() });
      if (filters.unit_id)
        query.andWhere('promotion.unit_id = :unitId', { unitId: filters.unit_id });
      if (filters.product_id)
        query.andWhere('promotion.product_id = :productId', { productId: filters.product_id });
      const [data, total] = await query
        .orderBy('promotion.ends_at', 'ASC')
        .addOrderBy('promotion.id', 'ASC')
        .skip((filters.page - 1) * filters.limit)
        .take(filters.limit)
        .getManyAndCount();
      return {
        data,
        meta: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.max(Math.ceil(total / filters.limit), 1),
        },
      };
    }
    const where: Record<string, unknown> = {};
    if (filters.unit_id) where.unit_id = filters.unit_id;
    if (filters.product_id) where.product_id = filters.product_id;
    if (filters.active !== undefined) where.active = filters.active === 'true';

    return this.promotionRepository.find({ where, order: { id: 'ASC' } });
  }
}
