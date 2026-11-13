import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Canonicalize legacy manually placed pins; postal-code approximations stay unconfirmed. */
export class NormalizeConfirmedMapPins1794540000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    for (const table of ['units', 'addresses']) {
      await runner.query(`UPDATE ${table} SET coordinate_source='USER_PIN'
        WHERE coordinate_source='MAP_PIN'
          AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180`);
    }
  }

  async down(): Promise<void> {
    // Normalized pins cannot be distinguished from newly confirmed pins.
  }
}
