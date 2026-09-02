import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PrepareMultiUnitCheckout1788450000000 implements MigrationInterface {
  name = 'PrepareMultiUnitCheckout1788450000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN "checkout_id" uuid`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_orders_client_checkout_unit" ON "orders" ("client_id", "checkout_id", "unit_id") WHERE "checkout_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "quantity" TYPE numeric(12,3) USING "quantity"::numeric`,
    );
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "mp_checkout_url" varchar(500)`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "delivery_code_ciphertext" varchar(255)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "delivery_code_ciphertext"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "mp_checkout_url"`);
    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "quantity" TYPE integer USING ROUND("quantity")::integer`,
    );
    await queryRunner.query(`DROP INDEX "IDX_orders_client_checkout_unit"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "checkout_id"`);
  }
}
