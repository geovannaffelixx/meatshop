import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductListItemDto } from '../dtos/product-list-item.dto';
import { Product } from '../entities/product.entity';
import { Stock } from '../entities/stock.entity';

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
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
  ) {}

  async execute(filters: ListProductsFilters) {
    const where: Record<string, unknown> = {};
    if (filters.unitId) where.unit_id = filters.unitId;
    if (filters.categoryId) where.category_id = filters.categoryId;
    if (filters.active !== undefined) where.active = filters.active;

    const [products, total] = await this.productRepository.findAndCount({
      where,
      relations: ['category'],
      order: { id: 'ASC' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });

    const stocks =
      products.length > 0
        ? await this.stockRepository.find({
            where: { product_id: In(products.map((p) => p.id)) },
          })
        : [];
    const stockByProductId = new Map(stocks.map((s) => [s.product_id, s]));

    return {
      data: products.map((product) =>
        ProductListItemDto.fromEntity(product, stockByProductId.get(product.id) ?? null),
      ),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(Math.ceil(total / filters.limit), 1),
      },
    };
  }
}
