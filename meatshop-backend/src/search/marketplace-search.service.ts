import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { ProductListItemDto } from '../products/dtos/product-list-item.dto';
import { Product } from '../products/entities/product.entity';
import { Stock } from '../products/entities/stock.entity';
import { PublicUnitDto } from '../units/dtos/public-unit.dto';
import { Unit } from '../units/entities/unit.entity';
import { MarketplaceBrandsDto, MarketplaceSearchDto } from './dtos/marketplace-search.dto';

const ACTIVE_UNIT_CONDITION = 'unit.is_active = :unitActive';
const NO_MATCH = '1 = 0';

type SearchCriteria = {
  filters: MarketplaceSearchDto;
  term: string | null;
  brand?: string;
  category?: string;
  hasProductFilters: boolean;
};

type ProductPage = { raw: Record<string, unknown>[]; entities: Product[] };

@Injectable()
export class MarketplaceSearchService {
  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async execute(filters: MarketplaceSearchDto) {
    const criteria = this.criteria(filters);
    const unitQuery = this.unitQuery(criteria);
    const categoryQuery = this.categoryQuery(criteria);
    const productQuery = this.productQuery(criteria);
    const [unitCount, categoryCount, productCount] = await Promise.all([
      unitQuery.getCount(),
      categoryQuery.getCount(),
      productQuery.getCount(),
    ]);
    const start = (filters.page - 1) * filters.limit;
    const unitRange = this.range(start, filters.limit, 0, unitCount);
    const categoryRange = this.range(start, filters.limit, unitCount, categoryCount);
    const productRange = this.range(
      start,
      filters.limit,
      unitCount + categoryCount,
      productCount,
    );
    const [units, categories, productPage] = await Promise.all([
      this.pageOf(unitQuery, 'unit.name', 'unit.id', unitRange),
      this.pageOf(categoryQuery, 'category.name', 'category.id', categoryRange),
      this.productPage(productQuery, productRange),
    ]);
    const total = unitCount + categoryCount + productCount;
    return {
      data: this.combine(units, categories, productPage),
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
      .innerJoin('product.unit', 'unit', ACTIVE_UNIT_CONDITION, { unitActive: true })
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

  private criteria(filters: MarketplaceSearchDto): SearchCriteria {
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
    const hasProductFilters = Boolean(
      brand ||
      category ||
      filters.category_id ||
      filters.min_price !== undefined ||
      filters.max_price !== undefined,
    );
    if (!query && !hasProductFilters) {
      throw new BadRequestException('Provide a search term or at least one product filter');
    }
    const term = query ? `%${query.toLocaleLowerCase('pt-BR')}%` : null;
    return { filters, term, brand, category, hasProductFilters };
  }

  private unitQuery({ filters, term, hasProductFilters }: SearchCriteria) {
    const matchesName = Boolean(term && !hasProductFilters);
    const query = this.units
      .createQueryBuilder('unit')
      .where(matchesName ? 'LOWER(unit.name) LIKE :term' : NO_MATCH, matchesName ? { term } : {})
      .andWhere(ACTIVE_UNIT_CONDITION, { unitActive: true });
    if (filters.unit_id) query.andWhere('unit.id = :unitId', { unitId: filters.unit_id });
    return query;
  }

  private categoryQuery({ filters, term, hasProductFilters }: SearchCriteria) {
    const matchesName = Boolean(term && !hasProductFilters);
    const query = this.categories
      .createQueryBuilder('category')
      .innerJoin('category.unit', 'unit', ACTIVE_UNIT_CONDITION, { unitActive: true })
      .where('category.active = :active', { active: true })
      .andWhere(
        matchesName ? 'LOWER(category.name) LIKE :term' : NO_MATCH,
        matchesName ? { term } : {},
      );
    if (filters.unit_id)
      query.andWhere('category.unit_id = :unitId', {
        unitId: filters.unit_id,
      });
    if (filters.category_id)
      query.andWhere('category.id = :categoryId', {
        categoryId: filters.category_id,
      });
    return query;
  }

  private productQuery(criteria: SearchCriteria) {
    const query = this.products
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.unit', 'unit', ACTIVE_UNIT_CONDITION, { unitActive: true })
      .innerJoinAndSelect('product.category', 'category', 'category.active = :categoryActive', {
        categoryActive: true,
      })
      .innerJoin(Stock, 'stock', 'stock.product_id = product.id AND stock.quantity > 0')
      .addSelect('stock.quantity', 'market_stock_quantity')
      .addSelect('stock.min_quantity', 'market_stock_min_quantity')
      .where('product.active = :active', { active: true });
    if (criteria.term)
      query.andWhere(
        "(LOWER(product.name) LIKE :term OR LOWER(COALESCE(product.brand, '')) LIKE :term)",
        { term: criteria.term },
      );
    this.applyProductFilters(query, criteria);
    return query;
  }

  private applyProductFilters(
    query: SelectQueryBuilder<Product>,
    { filters, brand, category }: SearchCriteria,
  ): void {
    if (filters.unit_id) query.andWhere('product.unit_id = :unitId', { unitId: filters.unit_id });
    if (filters.category_id)
      query.andWhere('product.category_id = :categoryId', {
        categoryId: filters.category_id,
      });
    if (category)
      query.andWhere('LOWER(TRIM(category.name)) = :category', {
        category: category.toLocaleLowerCase('pt-BR'),
      });
    if (filters.min_price !== undefined)
      query.andWhere('product.price >= :minPrice', { minPrice: filters.min_price });
    if (filters.max_price !== undefined)
      query.andWhere('product.price <= :maxPrice', { maxPrice: filters.max_price });
    if (brand)
      query.andWhere('LOWER(TRIM(product.brand)) = :brand', {
        brand: brand.toLocaleLowerCase('pt-BR'),
      });
  }

  private range(start: number, pageSize: number, preceding: number, count: number) {
    const offset = Math.max(0, start - preceding);
    const limit = Math.max(0, Math.min(count - offset, start + pageSize - preceding - offset));
    return { offset, limit };
  }

  private async pageOf<T extends object>(
    query: SelectQueryBuilder<T>,
    nameColumn: string,
    idColumn: string,
    range: { offset: number; limit: number },
  ): Promise<T[]> {
    if (range.limit <= 0) return [];
    return query
      .orderBy(nameColumn, 'ASC')
      .addOrderBy(idColumn, 'ASC')
      .offset(range.offset)
      .limit(range.limit)
      .getMany();
  }

  private async productPage(
    query: SelectQueryBuilder<Product>,
    range: { offset: number; limit: number },
  ): Promise<ProductPage> {
    if (range.limit <= 0) return { raw: [], entities: [] };
    return query
      .orderBy('product.name', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .offset(range.offset)
      .limit(range.limit)
      .getRawAndEntities();
  }

  private combine(units: Unit[], categories: Category[], productPage: ProductPage) {
    const stocks = new Map<number, Stock>();
    for (const row of productPage.raw) {
      const stock = new Stock();
      stock.quantity = Number(row.market_stock_quantity);
      stock.min_quantity = Number(row.market_stock_min_quantity);
      stocks.set(Number(row.product_id), stock);
    }
    return [
      ...units.map((unit) => ({ type: 'UNIT', unit: PublicUnitDto.fromEntity(unit) })),
      ...categories.map((category) => ({ type: 'CATEGORY', category })),
      ...productPage.entities.map((product) => ({
        type: 'PRODUCT',
        product: ProductListItemDto.fromEntity(product, stocks.get(product.id) ?? null),
      })),
    ];
  }
}
