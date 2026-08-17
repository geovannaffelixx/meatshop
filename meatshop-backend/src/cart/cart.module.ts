import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { CartController } from './cart.controller';
import { CartItem } from './entities/cart-item.entity';
import { Cart } from './entities/cart.entity';
import { CartAccessService } from './services/cart-access.service';
import { AddItemToCartUseCase } from './use-cases/add-item-to-cart.use-case';
import { ClearCartUseCase } from './use-cases/clear-cart.use-case';
import { GetCartUseCase } from './use-cases/get-cart.use-case';
import { RemoveCartItemUseCase } from './use-cases/remove-cart-item.use-case';
import { UpdateCartItemUseCase } from './use-cases/update-cart-item.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem]), ProductsModule],
  controllers: [CartController],
  providers: [
    CartAccessService,
    GetCartUseCase,
    AddItemToCartUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    ClearCartUseCase,
  ],
})
export class CartModule {}
