import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../../users/entities/user.entity';
import { Address } from '../../users/entities/address.entity';
import { Unit } from '../../units/entities/unit.entity';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { BusinessHours } from '../../units/entities/business-hours.entity';
import { Category } from '../../categories/entities/category.entity';
import { Product } from '../../products/entities/product.entity';
import { Stock } from '../../products/entities/stock.entity';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { Coupon } from '../../promotions/entities/coupon.entity';
import { DeliveryPerson } from '../../delivery/entities/delivery-person.entity';
import { Vehicle } from '../../delivery/entities/vehicle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Address,
      Unit,
      UserUnit,
      BusinessHours,
      Category,
      Product,
      Stock,
      Promotion,
      Coupon,
      DeliveryPerson,
      Vehicle,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
