import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SharedRateLimit1793100001000 implements MigrationInterface {
  name = 'SharedRateLimit1793100001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE UNLOGGED TABLE rate_limit_counters (
      key varchar(160) PRIMARY KEY,
      window_started_at timestamptz NOT NULL DEFAULT now(),
      request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0)
    )`);
    await queryRunner.query(
      'CREATE INDEX IDX_rate_limit_counters_window ON rate_limit_counters(window_started_at)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS rate_limit_counters');
  }
}
