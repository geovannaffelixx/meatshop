import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceSingleDefaultAddress1788371000000 implements MigrationInterface {
  name = 'EnforceSingleDefaultAddress1788371000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH ranked_defaults AS (
        SELECT "id", ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "id") AS position
        FROM "addresses"
        WHERE "is_default" = true
      )
      UPDATE "addresses" AS address
      SET "is_default" = false
      FROM ranked_defaults
      WHERE address."id" = ranked_defaults."id"
        AND ranked_defaults.position > 1
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_addresses_user_default" ON "addresses" ("user_id") WHERE "is_default" = true`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_addresses_user_default"`);
  }
}
