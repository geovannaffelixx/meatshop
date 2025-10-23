/* eslint-disable */
/// <reference types="node" />

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';
import { Expense } from '../entities/expense.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

const type = process.env.DB_TYPE === 'postgres' ? 'postgres' : 'sqlite';

export default new DataSource({
  type: type as any,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database:
    type === 'postgres'
      ? process.env.DB_DATABASE
      : process.env.DB_PATH || 'data/meatshop.db',
  entities: [User, Order, Expense, RefreshToken],
  migrations: ['src/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});