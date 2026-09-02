import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PrepareProfileAddressAndCartForMobile1788370000000 implements MigrationInterface {
  name = 'PrepareProfileAddressAndCartForMobile1788370000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "addresses" ADD COLUMN "latitude" numeric(10,7)`);
    await queryRunner.query(`ALTER TABLE "addresses" ADD COLUMN "longitude" numeric(10,7)`);
    await queryRunner.query(
      `ALTER TABLE "cart_items" ALTER COLUMN "quantity" TYPE numeric(12,3) USING "quantity"::numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock" ALTER COLUMN "quantity" TYPE numeric(12,3) USING "quantity"::numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock" ALTER COLUMN "min_quantity" TYPE numeric(12,3) USING "min_quantity"::numeric`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock" ALTER COLUMN "min_quantity" TYPE integer USING ROUND("min_quantity")::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock" ALTER COLUMN "quantity" TYPE integer USING ROUND("quantity")::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ALTER COLUMN "quantity" TYPE integer USING ROUND("quantity")::integer`,
    );
    await queryRunner.query(`ALTER TABLE "addresses" DROP COLUMN "longitude"`);
    await queryRunner.query(`ALTER TABLE "addresses" DROP COLUMN "latitude"`);
  }
}
