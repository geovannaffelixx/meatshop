import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1763411186800 implements MigrationInterface {
    name = 'Auto1763411186800'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "status"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "status" character varying(30) NOT NULL DEFAULT 'Pendente'
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "valor" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."orders_paymentmethod_enum"
            RENAME TO "orders_paymentmethod_enum_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."orders_paymentmethod_enum" AS ENUM('Pix', 'Crédito', 'Débito', 'Dinheiro', 'Boleto')
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "paymentMethod" TYPE "public"."orders_paymentmethod_enum" USING "paymentMethod"::"text"::"public"."orders_paymentmethod_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."orders_paymentmethod_enum_old"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."orders_paymentmethod_enum_old" AS ENUM('Pix', 'Crédito', 'Débito', 'Dinheiro')
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "paymentMethod" TYPE "public"."orders_paymentmethod_enum_old" USING "paymentMethod"::"text"::"public"."orders_paymentmethod_enum_old"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."orders_paymentmethod_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."orders_paymentmethod_enum_old"
            RENAME TO "orders_paymentmethod_enum"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "valor"
            SET DEFAULT '0'
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "status"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "status" character varying NOT NULL DEFAULT 'Pendente'
        `);
    }

}
