import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSaldoMpToPaymentMethodEnum1772569020631 implements MigrationInterface {
    name = 'AddSaldoMpToPaymentMethodEnum1772569020631'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."orders_paymentmethod_enum" RENAME TO "orders_paymentmethod_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_paymentmethod_enum" AS ENUM('Pix', 'Crédito', 'Débito', 'Dinheiro', 'Boleto', 'Saldo MP')`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "paymentMethod" TYPE "public"."orders_paymentmethod_enum" USING "paymentMethod"::"text"::"public"."orders_paymentmethod_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_paymentmethod_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."orders_paymentmethod_enum_old" AS ENUM('Pix', 'Crédito', 'Débito', 'Dinheiro', 'Boleto')`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "paymentMethod" TYPE "public"."orders_paymentmethod_enum_old" USING "paymentMethod"::"text"::"public"."orders_paymentmethod_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."orders_paymentmethod_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."orders_paymentmethod_enum_old" RENAME TO "orders_paymentmethod_enum"`);
    }

}
