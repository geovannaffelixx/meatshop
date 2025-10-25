import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Auto1761413922095 implements MigrationInterface {
  name = 'Auto1761413922095';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "nome_fantasia" character varying(120) NOT NULL,
                "razao_social" character varying(120) NOT NULL,
                "cnpj" character varying(20) NOT NULL,
                "telefone" character varying(20),
                "celular" character varying(20),
                "logo_url" character varying,
                "cep" character varying(10),
                "logradouro" character varying(120),
                "numero" character varying(10),
                "complemento" character varying(60),
                "bairro" character varying(80),
                "cidade" character varying(80),
                "estado" character varying(2),
                "pais" character varying(80),
                "email" character varying(120) NOT NULL,
                "usuario" character varying(50) NOT NULL,
                "senha_hash" character varying NOT NULL,
                "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
                "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_a7815967475d0accd76feba8a1e" UNIQUE ("cnpj"),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "UQ_f06f84f3f2bc0696d00882fcfa9" UNIQUE ("usuario"),
                CONSTRAINT "UQ_a7815967475d0accd76feba8a1e" UNIQUE ("cnpj"),
                CONSTRAINT "UQ_f06f84f3f2bc0696d00882fcfa9" UNIQUE ("usuario"),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "orders" (
                "id" SERIAL NOT NULL,
                "cliente" character varying NOT NULL,
                "status" character varying NOT NULL DEFAULT 'Pendente',
                "valor" numeric(10, 2) NOT NULL DEFAULT '0',
                "criadoEm" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "expenses" (
                "id" SERIAL NOT NULL,
                "supplierName" character varying NOT NULL,
                "type" text NOT NULL,
                "amount" numeric(10, 2) NOT NULL,
                "discount" numeric(10, 2) NOT NULL DEFAULT '0',
                "paidAmount" numeric(10, 2) NOT NULL,
                "postedAt" text,
                "paidAt" text,
                "paymentMethod" text NOT NULL,
                "notes" text,
                "cpfCnpj" text,
                "supplierId" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d56aee4d1775f4caeba629dece" ON "expenses" ("paidAt")
        `);
    await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "id" SERIAL NOT NULL,
                "token" text NOT NULL,
                "jti" text,
                "expiresAt" TIMESTAMP NOT NULL,
                "revokedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" integer,
                CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_4542dd2f38a61354a040ba9fd5" ON "refresh_tokens" ("token")
        `);
    await queryRunner.query(`
            ALTER TABLE "refresh_tokens"
            ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_4542dd2f38a61354a040ba9fd5"
        `);
    await queryRunner.query(`
            DROP TABLE "refresh_tokens"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d56aee4d1775f4caeba629dece"
        `);
    await queryRunner.query(`
            DROP TABLE "expenses"
        `);
    await queryRunner.query(`
            DROP TABLE "orders"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
  }
}
