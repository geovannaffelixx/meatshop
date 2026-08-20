import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { UnitsModule } from '../units/units.module';
import { CouponsController } from './coupons.controller';
import { Coupon } from './entities/coupon.entity';
import { Promotion } from './entities/promotion.entity';
import { PromotionsController } from './promotions.controller';
import { ActivatePromotionUseCase } from './use-cases/activate-promotion.use-case';
import { CreateCouponUseCase } from './use-cases/create-coupon.use-case';
import { CreatePromotionUseCase } from './use-cases/create-promotion.use-case';
import { DeactivatePromotionUseCase } from './use-cases/deactivate-promotion.use-case';
import { GetPromotionUseCase } from './use-cases/get-promotion.use-case';
import { ListCouponsUseCase } from './use-cases/list-coupons.use-case';
import { ListPromotionsUseCase } from './use-cases/list-promotions.use-case';
import { UpdateCouponUseCase } from './use-cases/update-coupon.use-case';
import { UpdatePromotionUseCase } from './use-cases/update-promotion.use-case';
import { ValidateCouponUseCase } from './use-cases/validate-coupon.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, Coupon]), UnitsModule, ProductsModule],
  controllers: [PromotionsController, CouponsController],
  providers: [
    CreatePromotionUseCase,
    UpdatePromotionUseCase,
    ActivatePromotionUseCase,
    DeactivatePromotionUseCase,
    ListPromotionsUseCase,
    GetPromotionUseCase,
    CreateCouponUseCase,
    UpdateCouponUseCase,
    ListCouponsUseCase,
    ValidateCouponUseCase,
  ],
  exports: [TypeOrmModule, ValidateCouponUseCase],
})
export class PromotionsModule {}
