import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Like, Repository } from 'typeorm';
import { Product, ProductStatus } from './entities/product.entity';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';

type ListProductsResponse = {
  data: Array<{
    id: number;
    name: string;
    description: string;
    category: string;
    cut: string;
    brand?: string | null;
    quantity: string;
    price: number;
    promotionalPrice?: number | null;
    promotionActive: boolean;
    status: ProductStatus;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Controller('products')
export class ProductsController {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // GET /products?page=1&limit=10&id=&description=&category=&status=
  @Get()
  async list(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('id') idStr?: string,
    @Query('description') description?: string,
    @Query('category') category?: string,
    @Query('status') status?: ProductStatus | '',
  ): Promise<ListProductsResponse> {
    const page = Math.max(Number(pageStr) || 1, 1);
    const limit = Math.min(Math.max(Number(limitStr) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (idStr) {
      const id = Number(idStr);
      if (!Number.isNaN(id)) {
        where.id = id;
      }
    }

    if (description) {
      where.description = Like(`%${description}%`);
    }

    if (category) {
      where.category = ILike(`%${category}%`);
    }

    if (status) {
      where.status = status;
    }

    const [rows, total] = await this.productRepo.findAndCount({
      where,
      order: { id: 'ASC' },
      skip,
      take: limit,
    });

    const data = rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      cut: p.cut,
      brand: p.brand ?? null,
      quantity: p.quantity,
      price: Number(p.price),
      promotionalPrice: p.promotionalPrice ? Number(p.promotionalPrice) : null,
      promotionActive: p.promotionActive,
      status: p.status,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    };
  }

  // GET /products/:id
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      return { ok: false, message: 'Product not found' };
    }

    return {
      ok: true,
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        cut: product.cut,
        brand: product.brand ?? null,
        notes: product.notes ?? null,
        quantity: product.quantity,
        price: Number(product.price),
        promotionalPrice: product.promotionalPrice ? Number(product.promotionalPrice) : null,
        promotionActive: product.promotionActive,
        status: product.status,
      },
    };
  }

  // POST /products
  @Post()
  async create(@Body() body: CreateProductDto) {
    const resolvedStatus = this.resolveStatus(
      body.status ?? 'ACTIVE',
      body.promotionActive ?? false,
    );

    const product = this.productRepo.create({
      name: body.name,
      description: body.description,
      category: body.category,
      cut: body.cut,
      brand: body.brand,
      notes: body.notes,
      quantity: body.quantity,
      price: body.price,
      promotionalPrice: body.promotionalPrice ?? null,
      promotionActive: body.promotionActive ?? false,
      status: resolvedStatus,
    });

    const saved = await this.productRepo.save(product);

    return { ok: true, id: saved.id };
  }

  // PATCH /products/:id
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateProductDto) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      return { ok: false, message: 'Product not found' };
    }

    const merged = this.productRepo.merge(product, {
      name: body.name ?? product.name,
      description: body.description ?? product.description,
      category: body.category ?? product.category,
      cut: body.cut ?? product.cut,
      brand: body.brand ?? product.brand,
      notes: body.notes ?? product.notes,
      quantity: body.quantity ?? product.quantity,
      price: body.price ?? product.price,
      promotionalPrice: body.promotionalPrice ?? product.promotionalPrice,
      promotionActive: body.promotionActive ?? product.promotionActive,
    });

    merged.status = this.resolveStatus(body.status ?? merged.status, merged.promotionActive);

    const saved = await this.productRepo.save(merged);

    return { ok: true, id: saved.id };
  }

  private resolveStatus(
    status: ProductStatus | undefined,
    promotionActive: boolean,
  ): ProductStatus {
    if (status === 'INACTIVE') return 'INACTIVE';
    if (promotionActive) return 'ON_SALE';
    return 'ACTIVE';
  }
}
