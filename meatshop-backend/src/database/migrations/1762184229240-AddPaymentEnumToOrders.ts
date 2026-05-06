import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentEnumToOrders1762184229240 implements MigrationInterface {
  name = 'AddPaymentEnumToOrders1762184229240';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paymentMethod"`);
    await queryRunner.query(
      `CREATE TYPE "public"."orders_paymentmethod_enum" AS ENUM('Pix', 'Crédito', 'Débito', 'Dinheiro', 'Boleto')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "paymentMethod" "public"."orders_paymentmethod_enum"`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paymentMethod"`);
    await queryRunner.query(`DROP TYPE "public"."orders_paymentmethod_enum"`);
    await queryRunner.query(`ALTER TABLE "orders" ADD "paymentMethod" character varying(50)`);
  }
}
