import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { Unit } from '../units/entities/unit.entity';
import { MarketplaceSearchService } from './marketplace-search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, Category, Product])],
  controllers: [SearchController],
  providers: [MarketplaceSearchService],
})
export class SearchModule {}
