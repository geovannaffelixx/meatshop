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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Products')
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
  @ApiOperation({
    summary:
      'Lista os produtos, com filtros opcionais por unidade, categoria e status',
  })
  @ApiResponse({ status: 200, description: 'Lista de produtos retornada com sucesso' })
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
  @ApiOperation({ summary: 'Busca um produto pelo identificador' })
  @ApiResponse({ status: 200, description: 'Produto encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.getProductUseCase.execute(id);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cria um novo produto' })
  @ApiResponse({ status: 201, description: 'Produto criado com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não é administrador da unit' })
  @ApiResponse({ status: 404, description: 'Categoria informada não encontrada' })
  @ApiResponse({ status: 409, description: 'Categoria não pertence à unit informada' })
  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() currentUser: User) {
    return this.createProductUseCase.execute(dto, currentUser);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualiza um produto existente' })
  @ApiResponse({ status: 200, description: 'Produto atualizado com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não é administrador da unit' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @ApiResponse({ status: 409, description: 'Categoria não pertence à unit informada' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateProductUseCase.execute(id, dto, currentUser);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualiza a quantidade em estoque de um produto' })
  @ApiResponse({ status: 200, description: 'Estoque atualizado com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não é administrador da unit' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @Patch(':id/stock')
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateStockUseCase.execute(id, dto, currentUser);
  }
}
