import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';

export interface ListProductsFilters {
  unitId?: number;
  categoryId?: number;
  active?: boolean;
  page: number;
  limit: number;
}

@Injectable()
export class ListProductsUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async execute(filters: ListProductsFilters) {
    const where: Record<string, unknown> = {};
    if (filters.unitId) where.unit_id = filters.unitId;
    if (filters.categoryId) where.category_id = filters.categoryId;
    if (filters.active !== undefined) where.active = filters.active;

    const [data, total] = await this.productRepository.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });

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
}
