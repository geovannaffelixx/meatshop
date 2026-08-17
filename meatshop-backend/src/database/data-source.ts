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
      Unit,
      UserUnit,
    ],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
