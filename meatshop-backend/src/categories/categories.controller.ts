import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Lists categories with an optional unit filter' })
  @ApiResponse({
    status: 200,
    description: 'Category list returned successfully',
  })
  @Get()
  list(@Query('unit_id') unitId?: string, @Query('active') active?: string) {
    return this.listCategoriesUseCase.execute(
      unitId ? Number(unitId) : undefined,
      active === undefined ? undefined : active === 'true',
    );
  }

  @Public()
  @ApiOperation({ summary: 'Gets a category by identifier' })
  @ApiResponse({ status: 200, description: 'Category found successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.getCategoryUseCase.execute(id);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Creates a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 403, description: 'User is not a unit administrator' })
  @ApiResponse({
    status: 409,
    description: 'Category does not belong to the specified unit',
  })
  @Post()
  create(@Body() dto: CreateCategoryDto, @CurrentUser() currentUser: User) {
    return this.createCategoryUseCase.execute(dto, currentUser);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Updates an existing category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 403, description: 'User is not a unit administrator' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({
    status: 409,
    description: 'Category does not belong to the specified unit',
  })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateCategoryUseCase.execute(id, dto, currentUser);
  }
}
