import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RebuildCatalogSchema1786995793765 implements MigrationInterface {
  name = 'RebuildCatalogSchema1786995793765';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Drop old, DER-divergent products table ──────────────────────────
    await queryRunner.query(`DROP TABLE IF EXISTS "products" CASCADE`);

    // ── categories ───────────────────────────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "categories" (
                "id" SERIAL NOT NULL,
                "name" character varying(100) NOT NULL,
                "description" character varying(255),
                "active" boolean NOT NULL DEFAULT true,
                "unit_id" integer NOT NULL,
                CONSTRAINT "PK_categories" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "categories"
            ADD CONSTRAINT "FK_categories_unit_id" FOREIGN KEY ("unit_id")
            REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // ── products ─────────────────────────────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "products" (
                "id" SERIAL NOT NULL,
                "name" character varying(150) NOT NULL,
                "description" text NOT NULL,
                "price" numeric(10,2) NOT NULL,
                "unit_of_measure" character varying(50) NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "unit_id" integer NOT NULL,
                "category_id" integer NOT NULL,
                "brand" character varying(100),
                "image_url" character varying,
                CONSTRAINT "PK_products" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "products"
            ADD CONSTRAINT "FK_products_unit_id" FOREIGN KEY ("unit_id")
            REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "products"
            ADD CONSTRAINT "FK_products_category_id" FOREIGN KEY ("category_id")
            REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

    // ── stock ────────────────────────────────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "stock" (
                "id" SERIAL NOT NULL,
                "product_id" integer NOT NULL,
                "quantity" integer NOT NULL DEFAULT 0,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_stock_product_id" UNIQUE ("product_id"),
                CONSTRAINT "PK_stock" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "stock"
            ADD CONSTRAINT "FK_stock_product_id" FOREIGN KEY ("product_id")
            REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock" DROP CONSTRAINT "FK_stock_product_id"`,
    );
    await queryRunner.query(`DROP TABLE "stock"`);

    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_products_category_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_products_unit_id"`,
    );
    await queryRunner.query(`DROP TABLE "products"`);

    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_unit_id"`,
    );
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
