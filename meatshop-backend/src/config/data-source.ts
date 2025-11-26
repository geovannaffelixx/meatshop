import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';
import { Expense } from '../entities/expense.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Sale } from '../entities/sale.entity'; // <--- ADICIONE AQUI
import { Product } from '../entities/product.entity';

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
    : [User, Order, Expense, RefreshToken, Sale, Product],
  migrations: [`${__dirname}/../migrations/*.{ts,js}`],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
