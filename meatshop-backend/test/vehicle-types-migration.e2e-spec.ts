import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import { StandardizeVehicleTypes1793600000000 } from '../src/database/migrations/1793600000000-StandardizeVehicleTypes';

describe('Vehicle type migration (PostgreSQL)', () => {
  let database: DataSource;
  let runner: QueryRunner;
  const migration = new StandardizeVehicleTypes1793600000000();

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

  beforeEach(async () => {
    runner = database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    const schema = `vehicle_test_${randomUUID().replace(/-/g, '')}`;
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    expect((await runner.query('SELECT current_schema() AS name'))[0].name).toBe(schema);
    await runner.query(
      "CREATE TYPE delivery_persons_vehicle_enum AS ENUM ('MOTORCYCLE','BIKE','CAR','ON_FOOT')",
    );
    await runner.query(
      "CREATE TYPE vehicles_type_enum AS ENUM ('MOTORCYCLE','BIKE','CAR','SCOOTER')",
    );
    await runner.query(
      'CREATE TABLE delivery_persons (id serial PRIMARY KEY, vehicle delivery_persons_vehicle_enum NOT NULL)',
    );
    await runner.query(
      'CREATE TABLE vehicles (id serial PRIMARY KEY, type vehicles_type_enum NOT NULL)',
    );
  });

  afterEach(async () => {
    try {
      await runner.rollbackTransaction();
    } finally {
      await runner.release();
    }
  });
  afterAll(async () => {
    await database?.destroy();
  });

  it('restricts both enums and preserves supported rows when upgrading and rolling back', async () => {
    await runner.query(
      "INSERT INTO delivery_persons(vehicle) VALUES ('MOTORCYCLE'),('CAR'),('BIKE')",
    );
    await runner.query("INSERT INTO vehicles(type) VALUES ('MOTORCYCLE'),('CAR'),('BIKE')");
    await migration.up(runner);
    for (const type of ['delivery_persons_vehicle_enum', 'vehicles_type_enum']) {
      expect(
        (await runner.query(`SELECT enum_range(NULL::${type})::text AS values`))[0].values,
      ).toBe('{MOTORCYCLE,CAR,BIKE}');
    }
    expect((await runner.query('SELECT count(*)::int AS count FROM vehicles'))[0].count).toBe(3);
    await migration.down(runner);
    expect(
      (await runner.query('SELECT count(*)::int AS count FROM delivery_persons'))[0].count,
    ).toBe(3);
    await runner.query("INSERT INTO delivery_persons(vehicle) VALUES ('ON_FOOT')");
    await runner.query("INSERT INTO vehicles(type) VALUES ('SCOOTER')");
  });

  it.each([
    ['ON_FOOT', 'BIKE'],
    ['BIKE', 'SCOOTER'],
  ])('preserves legacy records instead of guessing a replacement for %s/%s', async (mode, type) => {
    await runner.query('INSERT INTO delivery_persons(vehicle) VALUES ($1)', [mode]);
    await runner.query('INSERT INTO vehicles(type) VALUES ($1)', [type]);
    await expect(migration.up(runner)).rejects.toThrow('no automatic conversion');
    expect((await runner.query('SELECT vehicle::text FROM delivery_persons'))[0].vehicle).toBe(
      mode,
    );
    expect((await runner.query('SELECT type::text FROM vehicles'))[0].type).toBe(type);
  });
});
