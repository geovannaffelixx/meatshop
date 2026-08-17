import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { UpdateStockDto } from './dtos/update-stock.dto';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { GetProductUseCase } from './use-cases/get-product.use-case';
import { ListProductsUseCase } from './use-cases/list-products.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';
import { UpdateStockUseCase } from './use-cases/update-stock.use-case';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly updateStockUseCase: UpdateStockUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly getProductUseCase: GetProductUseCase,
  ) {}

  @Public()
  @Get()
  list(
    @Query('unit_id') unitId?: string,
    @Query('category_id') categoryId?: string,
    @Query('active') active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listProductsUseCase.execute({
      unitId: unitId ? Number(unitId) : undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      active: active !== undefined ? active === 'true' : undefined,
      page: Math.max(Number(page) || 1, 1),
      limit: Math.min(Math.max(Number(limit) || 10, 1), 50),
    });
  }

  @Public()
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.getProductUseCase.execute(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() currentUser: User) {
    return this.createProductUseCase.execute(dto, currentUser);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateProductUseCase.execute(id, dto, currentUser);
  }

  @Patch(':id/stock')
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateStockUseCase.execute(id, dto, currentUser);
  }
}
