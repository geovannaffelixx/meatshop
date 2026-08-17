import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAddressesAndCartSchema1786996379479
  implements MigrationInterface {
  name = 'CreateAddressesAndCartSchema1786996379479';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── addresses ────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "addresses_label_enum" AS ENUM('Casa', 'Trabalho', 'Outro')`,
    );
    await queryRunner.query(`
            CREATE TABLE "addresses" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "street" character varying(150) NOT NULL,
                "number" character varying(20) NOT NULL,
                "complement" character varying(100),
                "neighborhood" character varying(100) NOT NULL,
                "city" character varying(80) NOT NULL,
                "state" character varying(2) NOT NULL,
                "zip_code" character varying(10) NOT NULL,
                "label" "addresses_label_enum" NOT NULL,
                "is_default" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_addresses" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "addresses"
            ADD CONSTRAINT "FK_addresses_user_id" FOREIGN KEY ("user_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // ── cart ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "cart" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_cart_user_id" UNIQUE ("user_id"),
                CONSTRAINT "PK_cart" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "cart"
            ADD CONSTRAINT "FK_cart_user_id" FOREIGN KEY ("user_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // ── cart_items ───────────────────────────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "cart_items" (
                "id" SERIAL NOT NULL,
                "cart_id" integer NOT NULL,
                "product_id" integer NOT NULL,
                "quantity" integer NOT NULL,
                "unit_price" numeric(10,2) NOT NULL,
                CONSTRAINT "PK_cart_items" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_cart_items_cart_id_product_id" ON "cart_items" ("cart_id", "product_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "cart_items"
            ADD CONSTRAINT "FK_cart_items_cart_id" FOREIGN KEY ("cart_id")
            REFERENCES "cart"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "cart_items"
            ADD CONSTRAINT "FK_cart_items_product_id" FOREIGN KEY ("product_id")
            REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_items_product_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_items_cart_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_cart_items_cart_id_product_id"`);
    await queryRunner.query(`DROP TABLE "cart_items"`);

    await queryRunner.query(`ALTER TABLE "cart" DROP CONSTRAINT "FK_cart_user_id"`);
    await queryRunner.query(`DROP TABLE "cart"`);

    await queryRunner.query(
      `ALTER TABLE "addresses" DROP CONSTRAINT "FK_addresses_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "addresses"`);
    await queryRunner.query(`DROP TYPE "addresses_label_enum"`);
  }
}
