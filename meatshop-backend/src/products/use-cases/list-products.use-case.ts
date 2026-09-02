import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductListItemDto } from '../dtos/product-list-item.dto';
import { Product } from '../entities/product.entity';
import { Stock } from '../entities/stock.entity';

export interface IListProductsFilters {
  unitId?: number;
  categoryId?: number;
  active?: boolean;
  available?: boolean;
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

  async execute(filters: IListProductsFilters) {
    if (filters.available) return this.listAvailable(filters);
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

  private async listAvailable(filters: IListProductsFilters) {
    const query = this.productRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.category', 'category', 'category.active = :categoryActive', {
        categoryActive: true,
      })
      .innerJoin(Stock, 'stock', 'stock.product_id = product.id AND stock.quantity > 0')
      .addSelect('stock.quantity', 'market_stock_quantity')
      .addSelect('stock.min_quantity', 'market_stock_min_quantity')
      .where('product.active = :active', { active: true });
    if (filters.unitId) query.andWhere('product.unit_id = :unitId', { unitId: filters.unitId });
    if (filters.categoryId)
      query.andWhere('product.category_id = :categoryId', { categoryId: filters.categoryId });
    const total = await query.getCount();
    const { entities, raw } = await query
      .orderBy('product.name', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getRawAndEntities();
    const quantities = new Map(raw.map((row) => [Number(row.product_id), new Stock()]));
    for (const row of raw) {
      const stock = quantities.get(Number(row.product_id))!;
      stock.quantity = Number(row.market_stock_quantity);
      stock.min_quantity = Number(row.market_stock_min_quantity);
    }
    return {
      data: entities.map((product) =>
        ProductListItemDto.fromEntity(product, quantities.get(product.id) ?? null),
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
