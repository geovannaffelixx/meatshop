import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { ProductListItemDto } from '../products/dtos/product-list-item.dto';
import { Product } from '../products/entities/product.entity';
import { Stock } from '../products/entities/stock.entity';
import { PublicUnitDto } from '../units/dtos/public-unit.dto';
import { Unit } from '../units/entities/unit.entity';
import { MarketplaceBrandsDto, MarketplaceSearchDto } from './dtos/marketplace-search.dto';

@Injectable()
export class MarketplaceSearchService {
  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
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
    const query = filters.q?.trim();
    const brand = filters.brand?.trim();
    const category = filters.category?.trim();
    if (
      !query &&
      !brand &&
      !category &&
      !filters.category_id &&
      filters.min_price === undefined &&
      filters.max_price === undefined
    ) {
      throw new BadRequestException('Provide a search term or at least one product filter');
    }
    const term = query ? `%${query.toLocaleLowerCase('pt-BR')}%` : null;
    const hasProductFilters = Boolean(
      brand ||
      category ||
      filters.category_id ||
      filters.min_price !== undefined ||
      filters.max_price !== undefined,
    );
    const unitQuery = this.units
      .createQueryBuilder('unit')
      .where(
        term && !hasProductFilters ? 'LOWER(unit.name) LIKE :term' : '1 = 0',
        term && !hasProductFilters ? { term } : {},
      );
    if (filters.unit_id) unitQuery.andWhere('unit.id = :unitId', { unitId: filters.unit_id });
    const categoryQuery = this.categories
      .createQueryBuilder('category')
      .where('category.active = :active', { active: true })
      .andWhere(
        term && !hasProductFilters ? 'LOWER(category.name) LIKE :term' : '1 = 0',
        term && !hasProductFilters ? { term } : {},
      );
    if (filters.unit_id)
      categoryQuery.andWhere('category.unit_id = :unitId', {
        unitId: filters.unit_id,
      });
    if (filters.category_id)
      categoryQuery.andWhere('category.id = :categoryId', {
        categoryId: filters.category_id,
      });
    const productQuery = this.products
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.unit', 'unit')
      .innerJoinAndSelect('product.category', 'category', 'category.active = :categoryActive', {
        categoryActive: true,
      })
      .innerJoin(Stock, 'stock', 'stock.product_id = product.id AND stock.quantity > 0')
      .addSelect('stock.quantity', 'market_stock_quantity')
      .addSelect('stock.min_quantity', 'market_stock_min_quantity')
      .where('product.active = :active', { active: true });
    if (term)
      productQuery.andWhere(
        "(LOWER(product.name) LIKE :term OR LOWER(COALESCE(product.brand, '')) LIKE :term)",
        { term },
      );
    if (filters.unit_id)
      productQuery.andWhere('product.unit_id = :unitId', {
        unitId: filters.unit_id,
      });
    if (filters.category_id)
      productQuery.andWhere('product.category_id = :categoryId', {
        categoryId: filters.category_id,
      });
    if (category)
      productQuery.andWhere('LOWER(TRIM(category.name)) = :category', {
        category: category.toLocaleLowerCase('pt-BR'),
      });
    if (filters.min_price !== undefined)
      productQuery.andWhere('product.price >= :minPrice', {
        minPrice: filters.min_price,
      });
    if (filters.max_price !== undefined)
      productQuery.andWhere('product.price <= :maxPrice', {
        maxPrice: filters.max_price,
      });
    if (brand)
      productQuery.andWhere('LOWER(TRIM(product.brand)) = :brand', {
        brand: brand.toLocaleLowerCase('pt-BR'),
      });

    const [unitCount, categoryCount, productCount] = await Promise.all([
      unitQuery.getCount(),
      categoryQuery.getCount(),
      productQuery.getCount(),
    ]);
    const start = (filters.page - 1) * filters.limit;
    const range = (preceding: number, count: number) => {
      const offset = Math.max(0, start - preceding);
      const limit = Math.max(
        0,
        Math.min(count - offset, start + filters.limit - preceding - offset),
      );
      return { offset, limit };
    };
    const unitRange = range(0, unitCount);
    const categoryRange = range(unitCount, categoryCount);
    const productRange = range(unitCount + categoryCount, productCount);
    const [units, categories, productResult] = await Promise.all([
      unitRange.limit > 0
        ? unitQuery
            .orderBy('unit.name', 'ASC')
            .addOrderBy('unit.id', 'ASC')
            .offset(unitRange.offset)
            .limit(unitRange.limit)
            .getMany()
        : [],
      categoryRange.limit > 0
        ? categoryQuery
            .orderBy('category.name', 'ASC')
            .addOrderBy('category.id', 'ASC')
            .offset(categoryRange.offset)
            .limit(categoryRange.limit)
            .getMany()
        : [],
      productRange.limit > 0
        ? productQuery
            .orderBy('product.name', 'ASC')
            .addOrderBy('product.id', 'ASC')
            .offset(productRange.offset)
            .limit(productRange.limit)
            .getRawAndEntities()
        : { raw: [], entities: [] },
    ]);
    const total = unitCount + categoryCount + productCount;
    const stocks = new Map<number, Stock>();
    for (const row of productResult.raw) {
      const stock = new Stock();
      stock.quantity = Number(row.market_stock_quantity);
      stock.min_quantity = Number(row.market_stock_min_quantity);
      stocks.set(Number(row.product_id), stock);
    }
    const combined = [
      ...units.map((unit) => ({
        type: 'UNIT',
        unit: PublicUnitDto.fromEntity(unit),
      })),
      ...categories.map((category) => ({ type: 'CATEGORY', category })),
      ...productResult.entities.map((product) => ({
        type: 'PRODUCT',
        product: ProductListItemDto.fromEntity(product, stocks.get(product.id) ?? null),
      })),
    ];
    return {
      data: combined,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(Math.ceil(total / filters.limit), 1),
      },
    };
  }

  async listBrands(filters: MarketplaceBrandsDto): Promise<string[]> {
    const query = this.products
      .createQueryBuilder('product')
      .innerJoin('product.category', 'category', 'category.active = :categoryActive', {
        categoryActive: true,
      })
      .innerJoin(Stock, 'stock', 'stock.product_id = product.id AND stock.quantity > 0')
      .select('MIN(TRIM(product.brand))', 'brand')
      .where('product.active = :active', { active: true })
      .andWhere('product.brand IS NOT NULL')
      .andWhere("TRIM(product.brand) <> ''");
    if (filters.unit_id) query.andWhere('product.unit_id = :unitId', { unitId: filters.unit_id });
    if (filters.category_id)
      query.andWhere('product.category_id = :categoryId', {
        categoryId: filters.category_id,
      });
    const category = filters.category?.trim();
    if (category)
      query.andWhere('LOWER(TRIM(category.name)) = :category', {
        category: category.toLocaleLowerCase('pt-BR'),
      });
    const rows = await query
      .groupBy('LOWER(TRIM(product.brand))')
      .orderBy('LOWER(TRIM(product.brand))', 'ASC')
      .getRawMany<{ brand: string }>();
    return rows.map(({ brand: value }) => value);
  }
}
