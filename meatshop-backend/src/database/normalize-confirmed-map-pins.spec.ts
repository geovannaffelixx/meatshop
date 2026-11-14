import { PGlite } from '@electric-sql/pglite';
import type { QueryRunner } from 'typeorm';
import { NormalizeConfirmedMapPins1794540000000 } from './migrations/1794540000000-NormalizeConfirmedMapPins';

it('normalizes valid legacy manual pins while retaining postal approximations and invalid locations', async () => {
  const db = new PGlite();
  try {
    for (const table of ['units', 'addresses']) {
      await db.exec(`CREATE TABLE ${table}(id int,coordinate_source text,latitude numeric,longitude numeric);
        INSERT INTO ${table} VALUES (1,'MAP_PIN',-16.3,-48.9),(2,'POSTAL_CODE',-16.3,-48.9),
          (3,'MAP_PIN',NULL,NULL),(4,'MAP_PIN',100,-48.9),(5,'USER_PIN',-16.3,-48.9)`);
    }
    const runner = { query: (sql: string) => db.query(sql) } as unknown as QueryRunner;
    await new NormalizeConfirmedMapPins1794540000000().up(runner);
    for (const table of ['units', 'addresses']) {
      const result = await db.query<{ coordinate_source: string }>(
        `SELECT coordinate_source FROM ${table} ORDER BY id`,
      );
      expect(result.rows.map((r) => r.coordinate_source)).toEqual([
        'USER_PIN',
        'POSTAL_CODE',
        'MAP_PIN',
        'MAP_PIN',
        'USER_PIN',
      ]);
    }
  } finally {
    await db.close();
  }
}, 30000);
