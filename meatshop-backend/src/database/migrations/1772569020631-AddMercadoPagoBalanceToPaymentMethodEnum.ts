import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMercadoPagoBalanceToPaymentMethodEnum1772569020631 implements MigrationInterface {
  name = 'AddMercadoPagoBalanceToPaymentMethodEnum1772569020631';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."orders_paymentmethod_enum" RENAME TO "orders_paymentmethod_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_paymentmethod_enum" AS ENUM('Pix', 'Credit', 'Debit', 'Cash', 'Bank Slip', 'Mercado Pago Balance')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "paymentMethod" TYPE "public"."orders_paymentmethod_enum" USING "paymentMethod"::"text"::"public"."orders_paymentmethod_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."orders_paymentmethod_enum_old"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."orders_paymentmethod_enum_old" AS ENUM('Pix', 'Credit', 'Debit', 'Cash', 'Bank Slip')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "paymentMethod" TYPE "public"."orders_paymentmethod_enum_old" USING "paymentMethod"::"text"::"public"."orders_paymentmethod_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."orders_paymentmethod_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."orders_paymentmethod_enum_old" RENAME TO "orders_paymentmethod_enum"`,
    );
  }
}
