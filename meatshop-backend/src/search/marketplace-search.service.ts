import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { ProductListItemDto } from '../products/dtos/product-list-item.dto';
import { Product } from '../products/entities/product.entity';
import { Stock } from '../products/entities/stock.entity';
import { PublicUnitDto } from '../units/dtos/public-unit.dto';
import { Unit } from '../units/entities/unit.entity';
import { MarketplaceSearchDto } from './dtos/marketplace-search.dto';

@Injectable()
export class MarketplaceSearchService {
  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async execute(filters: MarketplaceSearchDto) {
    if (
      filters.min_price !== undefined &&
      filters.max_price !== undefined &&
      filters.min_price > filters.max_price
    ) {
      throw new BadRequestException('Minimum price cannot exceed maximum price');
    }
    const term = `%${filters.q.trim().toLocaleLowerCase('pt-BR')}%`;
    const unitQuery = this.units
      .createQueryBuilder('unit')
      .where('LOWER(unit.name) LIKE :term', { term });
    if (filters.unit_id) unitQuery.andWhere('unit.id = :unitId', { unitId: filters.unit_id });
    const categoryQuery = this.categories
      .createQueryBuilder('category')
      .where('category.active = :active', { active: true })
      .andWhere('LOWER(category.name) LIKE :term', { term });
    if (filters.unit_id)
      categoryQuery.andWhere('category.unit_id = :unitId', { unitId: filters.unit_id });
    if (filters.category_id)
      categoryQuery.andWhere('category.id = :categoryId', { categoryId: filters.category_id });
    const productQuery = this.products
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.unit', 'unit')
      .innerJoinAndSelect('product.category', 'category', 'category.active = :categoryActive', {
        categoryActive: true,
      })
      .innerJoin(Stock, 'stock', 'stock.product_id = product.id AND stock.quantity > 0')
      .addSelect('stock.quantity', 'market_stock_quantity')
      .addSelect('stock.min_quantity', 'market_stock_min_quantity')
      .where('product.active = :active', { active: true })
      .andWhere('LOWER(product.name) LIKE :term', { term });
    if (filters.unit_id)
      productQuery.andWhere('product.unit_id = :unitId', { unitId: filters.unit_id });
    if (filters.category_id)
      productQuery.andWhere('product.category_id = :categoryId', {
        categoryId: filters.category_id,
      });
    if (filters.min_price !== undefined)
      productQuery.andWhere('product.price >= :minPrice', { minPrice: filters.min_price });
    if (filters.max_price !== undefined)
      productQuery.andWhere('product.price <= :maxPrice', { maxPrice: filters.max_price });

    const [units, categories, productResult] = await Promise.all([
      unitQuery.orderBy('unit.name', 'ASC').getMany(),
      categoryQuery.orderBy('category.name', 'ASC').getMany(),
      productQuery.orderBy('product.name', 'ASC').getRawAndEntities(),
    ]);
    const stocks = new Map<number, Stock>();
    for (const row of productResult.raw) {
      const stock = new Stock();
      stock.quantity = Number(row.market_stock_quantity);
      stock.min_quantity = Number(row.market_stock_min_quantity);
      stocks.set(Number(row.product_id), stock);
    }
    const combined = [
      ...units.map((unit) => ({ type: 'UNIT', unit: PublicUnitDto.fromEntity(unit) })),
      ...categories.map((category) => ({ type: 'CATEGORY', category })),
      ...productResult.entities.map((product) => ({
        type: 'PRODUCT',
        product: ProductListItemDto.fromEntity(product, stocks.get(product.id) ?? null),
      })),
    ];
    const start = (filters.page - 1) * filters.limit;
    return {
      data: combined.slice(start, start + filters.limit),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: combined.length,
        totalPages: Math.max(Math.ceil(combined.length / filters.limit), 1),
      },
    };
  }
}
