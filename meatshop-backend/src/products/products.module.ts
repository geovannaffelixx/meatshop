import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { UnitsModule } from '../units/units.module';
import { Product } from './entities/product.entity';
import { Stock } from './entities/stock.entity';
import { ProductsController } from './products.controller';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { GetProductUseCase } from './use-cases/get-product.use-case';
import { ListProductsUseCase } from './use-cases/list-products.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';
import { UpdateStockUseCase } from './use-cases/update-stock.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Stock]),
    UnitsModule,
    CategoriesModule,
  ],
  controllers: [ProductsController],
  providers: [
    CreateProductUseCase,
    UpdateProductUseCase,
    UpdateStockUseCase,
    ListProductsUseCase,
    GetProductUseCase,
  ],
  exports: [TypeOrmModule],
})
export class ProductsModule {}
