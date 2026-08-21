import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitsModule } from '../units/units.module';
import { CategoriesController } from './categories.controller';
import { Category } from './entities/category.entity';
import { CreateCategoryUseCase } from './use-cases/create-category.use-case';
import { GetCategoryUseCase } from './use-cases/get-category.use-case';
import { ListCategoriesUseCase } from './use-cases/list-categories.use-case';
import { UpdateCategoryUseCase } from './use-cases/update-category.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), UnitsModule],
  controllers: [CategoriesController],
  providers: [
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    ListCategoriesUseCase,
    GetCategoryUseCase,
  ],
  exports: [TypeOrmModule],
})
export class CategoriesModule {}
