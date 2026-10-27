import { searchPattern } from '../../common/dtos/panel-list-query.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Raw, Repository, In } from 'typeorm';
import { ProductListItemDto } from '../dtos/product-list-item.dto';
import { Product } from '../entities/product.entity';
import { Stock } from '../entities/stock.entity';

export interface IListProductsFilters {
  search?: string;
  category?: string;
  id?: string;
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
    const [products, total] = await this.productRepository.findAndCount({
      where: this.managedWhere(filters),
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
    return this.page(
      products.map((product) =>
        ProductListItemDto.fromEntity(product, stockByProductId.get(product.id) ?? null),
      ),
      total,
      filters,
    );
  }

  private managedWhere(filters: IListProductsFilters): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    if (filters.search?.trim()) where.name = ILike(searchPattern(filters.search));
    if (filters.category?.trim()) where.category = { name: ILike(searchPattern(filters.category)) };
    if (filters.id?.trim())
      where.id = Raw((alias) => `CAST(${alias} AS TEXT) LIKE :productId`, {
        productId: searchPattern(filters.id),
      });
    if (filters.unitId) where.unit_id = filters.unitId;
    if (filters.categoryId) where.category_id = filters.categoryId;
    if (filters.active !== undefined) where.active = filters.active;
    return where;
  }

  private async listAvailable(filters: IListProductsFilters) {
    const query = this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.unit', 'unit', 'unit.is_active = :unitActive', { unitActive: true })
      .innerJoinAndSelect('product.category', 'category', 'category.active = :categoryActive', {
        categoryActive: true,
      })
      .innerJoin(Stock, 'stock', 'stock.product_id = product.id AND stock.quantity > 0')
      .addSelect('stock.quantity', 'market_stock_quantity')
      .addSelect('stock.min_quantity', 'market_stock_min_quantity')
      .where('product.active = :active', { active: true });
    if (filters.unitId) query.andWhere('product.unit_id = :unitId', { unitId: filters.unitId });
    if (filters.categoryId)
      query.andWhere('product.category_id = :categoryId', {
        categoryId: filters.categoryId,
      });
    const total = await query.getCount();
    const { entities, raw } = await query
      .orderBy('product.name', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getRawAndEntities();
    const stocks = this.marketStocks(raw);
    return this.page(
      entities.map((product) =>
        ProductListItemDto.fromEntity(product, stocks.get(product.id) ?? null),
      ),
      total,
      filters,
    );
  }

  private marketStocks(raw: Record<string, unknown>[]): Map<number, Stock> {
    const stocks = new Map<number, Stock>();
    for (const row of raw) {
      const stock = new Stock();
      stock.quantity = Number(row.market_stock_quantity);
      stock.min_quantity = Number(row.market_stock_min_quantity);
      stocks.set(Number(row.product_id), stock);
    }
    return stocks;
  }

  private page(data: ProductListItemDto[], total: number, filters: IListProductsFilters) {
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
