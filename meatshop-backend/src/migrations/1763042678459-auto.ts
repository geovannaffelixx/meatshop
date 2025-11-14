import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1763042678459 implements MigrationInterface {
    name = 'Auto1763042678459'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "sales" (
                "id" SERIAL NOT NULL,
                "name" character varying(150) NOT NULL,
                "image_url" character varying(500) NOT NULL,
                "discountValue" numeric(10, 2) NOT NULL DEFAULT '0',
                "active" boolean NOT NULL DEFAULT true,
                "starts_at" TIMESTAMP,
                "ends_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "criadoEm"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "cpf_cnpj" character varying(20)
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "desconto" numeric(10, 2) NOT NULL DEFAULT '0'
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "valor_pago" numeric(10, 2) NOT NULL DEFAULT '0'
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "data_agendada" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "data_entrega" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "observacoes" text
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "criado_em" TIMESTAMP NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "atualizado_em" TIMESTAMP NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "cliente"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "cliente" character varying(150) NOT NULL
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."orders_paymentmethod_enum"
            RENAME TO "orders_paymentmethod_enum_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."orders_paymentmethod_enum" AS ENUM('Pix', 'Crédito', 'Débito', 'Dinheiro')
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
            CREATE TYPE "public"."orders_paymentmethod_enum_old" AS ENUM('Pix', 'Crédito', 'Débito', 'Dinheiro', 'Boleto')
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
            ALTER TABLE "orders" DROP COLUMN "cliente"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "cliente" character varying NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "atualizado_em"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "criado_em"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "observacoes"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "data_entrega"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "data_agendada"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "valor_pago"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "desconto"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "cpf_cnpj"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "criadoEm" TIMESTAMP NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            DROP TABLE "sales"
        `);
    }

}
