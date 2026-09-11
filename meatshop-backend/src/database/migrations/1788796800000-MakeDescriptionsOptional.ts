import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeDescriptionsOptional1788796800000 implements MigrationInterface {
  name = 'MakeDescriptionsOptional1788796800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "description" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "recipes" ALTER COLUMN "description" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "support_tickets" ALTER COLUMN "description" DROP NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "products" SET "description" = '' WHERE "description" IS NULL`);
    await queryRunner.query(`UPDATE "recipes" SET "description" = '' WHERE "description" IS NULL`);
    await queryRunner.query(
      `UPDATE "support_tickets" SET "description" = '' WHERE "description" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "description" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "recipes" ALTER COLUMN "description" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "support_tickets" ALTER COLUMN "description" SET NOT NULL`,
    );
  }
}
