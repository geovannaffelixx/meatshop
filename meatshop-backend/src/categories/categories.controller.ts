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
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { CreateCategoryUseCase } from './use-cases/create-category.use-case';
import { GetCategoryUseCase } from './use-cases/get-category.use-case';
import { ListCategoriesUseCase } from './use-cases/list-categories.use-case';
import { UpdateCategoryUseCase } from './use-cases/update-category.use-case';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly getCategoryUseCase: GetCategoryUseCase,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Lista as categorias, opcionalmente filtradas por unidade' })
  @ApiResponse({ status: 200, description: 'Lista de categorias retornada com sucesso' })
  @Get()
  list(@Query('unit_id') unitId?: string) {
    return this.listCategoriesUseCase.execute(
      unitId ? Number(unitId) : undefined,
    );
  }

  @Public()
  @ApiOperation({ summary: 'Busca uma categoria pelo identificador' })
  @ApiResponse({ status: 200, description: 'Categoria encontrada com sucesso' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.getCategoryUseCase.execute(id);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cria uma nova categoria' })
  @ApiResponse({ status: 201, description: 'Categoria criada com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não é administrador da unit' })
  @ApiResponse({ status: 409, description: 'Categoria não pertence à unit informada' })
  @Post()
  create(@Body() dto: CreateCategoryDto, @CurrentUser() currentUser: User) {
    return this.createCategoryUseCase.execute(dto, currentUser);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualiza uma categoria existente' })
  @ApiResponse({ status: 200, description: 'Categoria atualizada com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não é administrador da unit' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({ status: 409, description: 'Categoria não pertence à unit informada' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateCategoryUseCase.execute(id, dto, currentUser);
  }
}
