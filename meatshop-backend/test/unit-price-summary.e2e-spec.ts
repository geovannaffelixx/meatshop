import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { unitPricesPerKg } from '../src/units/utils/unit-price-summary';

describe('Comparable unit prices (PostgreSQL)', () => {
  let database: DataSource;
  beforeAll(async () => {
    database = await new DataSource({
      type: 'postgres',
      host: '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 5433),
      username: process.env.DB_USERNAME ?? 'meatshop_user',
      password: process.env.DB_PASSWORD ?? 'meatshop_pass',
      database: process.env.DB_DATABASE ?? 'meatshop',
      ssl: false,
    }).initialize();
  });
  afterAll(async () => {
    await database?.destroy();
  });

  it('normalizes grams and excludes unavailable products and incompatible units of measure', async () => {
    const runner = database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const schema = `unit_prices_${randomUUID().replace(/-/g, '')}`;
      await runner.query(`CREATE SCHEMA "${schema}"`);
      await runner.query(`SET LOCAL search_path TO "${schema}"`);
      await runner.query('CREATE TABLE categories (id int PRIMARY KEY, active boolean)');
      await runner.query(
        'CREATE TABLE products (id int PRIMARY KEY, unit_id int, category_id int, price numeric, unit_of_measure text, active boolean)',
      );
      await runner.query('CREATE TABLE stock (product_id int PRIMARY KEY, quantity numeric)');
      await runner.query('INSERT INTO categories VALUES (1,true),(2,false)');
      await runner.query(
        "INSERT INTO products VALUES (1,1,1,40,'kg',true),(2,1,1,0.06,'G',true),(3,1,1,2,'UN',true),(4,1,1,999,'KG',false),(5,1,2,500,'KG',true),(6,1,1,1,'KG',true),(7,2,1,100,'KG',true),(8,3,1,5,'UN',true)",
      );
      await runner.query(
        'INSERT INTO stock VALUES (1,10),(2,1000),(3,10),(4,10),(5,10),(6,0),(7,2),(8,5)',
      );
      const prices = await unitPricesPerKg(runner.manager, [1, 2, 3]);
      expect(prices.get(1)).toBe(50);
      expect(prices.get(2)).toBe(100);
      expect(prices.has(3)).toBe(false);
      await runner.query('UPDATE stock SET quantity=0 WHERE product_id=1');
      expect((await unitPricesPerKg(runner.manager, [1])).get(1)).toBe(60);
      await runner.query('UPDATE stock SET quantity=0');
      expect((await unitPricesPerKg(runner.manager, [1, 2, 3])).size).toBe(0);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
