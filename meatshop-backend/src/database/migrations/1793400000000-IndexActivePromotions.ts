import type { MigrationInterface, QueryRunner } from 'typeorm';

export class IndexActivePromotions1793400000000 implements MigrationInterface {
  name = 'IndexActivePromotions1793400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX "IDX_promotions_active_product_period" ON "promotions" ("product_id", "starts_at", "ends_at") WHERE "active" = true',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_promotions_active_product_period"');
  }
}
