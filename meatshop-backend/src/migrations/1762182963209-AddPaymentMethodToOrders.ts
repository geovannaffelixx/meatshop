import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMethodToOrders1762182963209 implements MigrationInterface {
  name = 'AddPaymentMethodToOrders1762182963209';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "paymentMethod" character varying(50)`);
    await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "paidAmount" SET DEFAULT '0'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "paidAmount" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paymentMethod"`);
  }
}
