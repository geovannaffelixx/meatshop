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
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { CreateCategoryUseCase } from './use-cases/create-category.use-case';
import { GetCategoryUseCase } from './use-cases/get-category.use-case';
import { ListCategoriesUseCase } from './use-cases/list-categories.use-case';
import { UpdateCategoryUseCase } from './use-cases/update-category.use-case';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly getCategoryUseCase: GetCategoryUseCase,
  ) {}

  @Public()
  @Get()
  list(@Query('unit_id') unitId?: string) {
    return this.listCategoriesUseCase.execute(
      unitId ? Number(unitId) : undefined,
    );
  }

  @Public()
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.getCategoryUseCase.execute(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto, @CurrentUser() currentUser: User) {
    return this.createCategoryUseCase.execute(dto, currentUser);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateCategoryUseCase.execute(id, dto, currentUser);
  }
}
