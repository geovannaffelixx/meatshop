import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { Expense } from '../finance/entities/expense.entity';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';
import { Sale } from '../finance/entities/sale.entity';
import { Product } from '../products/entities/product.entity';
import { Stock } from '../products/entities/stock.entity';
import { Category } from '../categories/entities/category.entity';
import { Address } from '../users/entities/address.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Coupon } from '../promotions/entities/coupon.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Payment } from '../orders/entities/payment.entity';
import { OrderStatusHistory } from '../orders/entities/order-status-history.entity';
import { DeliveryPerson } from '../delivery/entities/delivery-person.entity';
import { Vehicle } from '../delivery/entities/vehicle.entity';
import { DeliveryTracking } from '../delivery/entities/delivery-tracking.entity';
import { Review } from '../reviews/entities/review.entity';
import { DeliveryReview } from '../reviews/entities/delivery-review.entity';
import { Unit } from '../units/entities/unit.entity';
import { UserUnit } from '../units/entities/user-unit.entity';

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || '.env',
});

const isCompiled = __dirname.includes('dist');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: isCompiled
    ? [`${__dirname}/../entities/*.js`]
    : [
      User,
      Order,
      Expense,
      RefreshTokenEntity,
      Sale,
      Product,
      Stock,
      Category,
      Address,
      Cart,
      CartItem,
      Promotion,
      Coupon,
      OrderItem,
      Payment,
      OrderStatusHistory,
      DeliveryPerson,
      Vehicle,
      DeliveryTracking,
      Review,
      DeliveryReview,
      Unit,
      UserUnit,
    ],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
