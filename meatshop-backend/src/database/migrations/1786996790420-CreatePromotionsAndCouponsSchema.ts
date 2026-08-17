import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePromotionsAndCouponsSchema1786996790420
  implements MigrationInterface {
  name = 'CreatePromotionsAndCouponsSchema1786996790420';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── promotions ───────────────────────────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "promotions" (
                "id" SERIAL NOT NULL,
                "unit_id" integer NOT NULL,
                "product_id" integer NOT NULL,
                "title" character varying(150) NOT NULL,
                "description" text,
                "discount_percentage" numeric(5,2),
                "promotional_price" numeric(10,2),
                "starts_at" TIMESTAMP NOT NULL,
                "ends_at" TIMESTAMP NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_promotions" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "promotions"
            ADD CONSTRAINT "FK_promotions_unit_id" FOREIGN KEY ("unit_id")
            REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "promotions"
            ADD CONSTRAINT "FK_promotions_product_id" FOREIGN KEY ("product_id")
            REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // ── coupons ──────────────────────────────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "coupons" (
                "id" SERIAL NOT NULL,
                "code" character varying(50) NOT NULL,
                "discount_percentage" numeric(5,2),
                "discount_value" numeric(10,2),
                "expires_at" TIMESTAMP NOT NULL,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_coupons_code" UNIQUE ("code"),
                CONSTRAINT "PK_coupons" PRIMARY KEY ("id")
            )
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "coupons"`);

    await queryRunner.query(
      `ALTER TABLE "promotions" DROP CONSTRAINT "FK_promotions_product_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotions" DROP CONSTRAINT "FK_promotions_unit_id"`,
    );
    await queryRunner.query(`DROP TABLE "promotions"`);
  }
}
