import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedByToPromotions1787234058426 implements MigrationInterface {
  name = 'AddCreatedByToPromotions1787234058426';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "promotions" ADD "created_by" integer`);

    // Backfill any pre-existing promotions (created before this column existed) to their unit's admin.
    await queryRunner.query(`
            UPDATE "promotions" p
            SET "created_by" = u."admin_id"
            FROM "units" u
            WHERE p."unit_id" = u."id" AND p."created_by" IS NULL
        `);

    await queryRunner.query(`ALTER TABLE "promotions" ALTER COLUMN "created_by" SET NOT NULL`);
    await queryRunner.query(`
            ALTER TABLE "promotions"
            ADD CONSTRAINT "FK_promotions_created_by" FOREIGN KEY ("created_by")
            REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_promotions_created_by"`);
    await queryRunner.query(`ALTER TABLE "promotions" DROP COLUMN "created_by"`);
  }
}
