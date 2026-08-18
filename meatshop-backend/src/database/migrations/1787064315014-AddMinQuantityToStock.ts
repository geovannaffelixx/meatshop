import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMinQuantityToStock1787064315014 implements MigrationInterface {
  name = 'AddMinQuantityToStock1787064315014';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock" ADD "min_quantity" integer NOT NULL DEFAULT 0`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stock" DROP COLUMN "min_quantity"`);
  }
}
