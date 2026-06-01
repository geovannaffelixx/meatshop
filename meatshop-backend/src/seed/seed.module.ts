import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';
import { Expense } from '../entities/expense.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Sale } from '../entities/sale.entity';
import { Product } from '../entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Order, Expense, RefreshToken, Sale, Product])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
