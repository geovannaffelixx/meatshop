import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1764185136717 implements MigrationInterface {
  name = 'CreateProductsTable1764185136717';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "products" ("id" SERIAL NOT NULL, "name" character varying(150) NOT NULL, "description" character varying(255) NOT NULL, "category" character varying(100) NOT NULL, "cut" character varying(100) NOT NULL, "brand" character varying(100), "notes" text, "quantity" character varying(50) NOT NULL, "price" numeric(10,2) NOT NULL, "promotional_price" numeric(10,2), "promotion_active" boolean NOT NULL DEFAULT false, "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c3932231d2385ac248d0888d95" ON "products" ("category") `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_c3932231d2385ac248d0888d95"`);
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
