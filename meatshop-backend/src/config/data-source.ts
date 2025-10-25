import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';
import { Expense } from '../entities/expense.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

const isCompiled = __dirname.includes('dist');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'meatshop_user',
  password: process.env.DB_PASSWORD || 'meatshop_pass',
  database: process.env.DB_DATABASE || 'meatshop',
  entities: isCompiled ? [`${__dirname}/../entities/*.js`] : [User, Order, Expense, RefreshToken],
  migrations: [`${__dirname}/../migrations/*.{ts,js}`],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
