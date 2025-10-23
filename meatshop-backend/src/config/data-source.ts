import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';
import { Expense } from '../entities/expense.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'meatshop',
  entities: [User, Order, Expense, RefreshToken],
  migrations: ['dist/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
