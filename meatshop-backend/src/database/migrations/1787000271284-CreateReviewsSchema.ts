import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewsSchema1787000271284 implements MigrationInterface {
  name = 'CreateReviewsSchema1787000271284';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── reviews (unidade e/ou produto) ──────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "reviews" (
                "id" SERIAL NOT NULL,
                "order_id" integer NOT NULL,
                "client_id" integer NOT NULL,
                "unit_id" integer NOT NULL,
                "product_id" integer,
                "rating" integer NOT NULL,
                "comment" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5),
                CONSTRAINT "PK_reviews" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "reviews"
            ADD CONSTRAINT "FK_reviews_order_id" FOREIGN KEY ("order_id")
            REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "reviews"
            ADD CONSTRAINT "FK_reviews_client_id" FOREIGN KEY ("client_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "reviews"
            ADD CONSTRAINT "FK_reviews_unit_id" FOREIGN KEY ("unit_id")
            REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "reviews"
            ADD CONSTRAINT "FK_reviews_product_id" FOREIGN KEY ("product_id")
            REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_reviews_order_product" ON "reviews" ("order_id", "product_id")
            WHERE "product_id" IS NOT NULL
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_reviews_order_unit_only" ON "reviews" ("order_id")
            WHERE "product_id" IS NULL
        `);

    // ── delivery_reviews ─────────────────────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "delivery_reviews" (
                "id" SERIAL NOT NULL,
                "order_id" integer NOT NULL,
                "client_id" integer NOT NULL,
                "delivery_person_id" integer NOT NULL,
                "rating" integer NOT NULL,
                "comment" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_delivery_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5),
                CONSTRAINT "UQ_delivery_reviews_order_id" UNIQUE ("order_id"),
                CONSTRAINT "PK_delivery_reviews" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "delivery_reviews"
            ADD CONSTRAINT "FK_delivery_reviews_order_id" FOREIGN KEY ("order_id")
            REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "delivery_reviews"
            ADD CONSTRAINT "FK_delivery_reviews_client_id" FOREIGN KEY ("client_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "delivery_reviews"
            ADD CONSTRAINT "FK_delivery_reviews_delivery_person_id" FOREIGN KEY ("delivery_person_id")
            REFERENCES "delivery_persons"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery_reviews" DROP CONSTRAINT "FK_delivery_reviews_delivery_person_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_reviews" DROP CONSTRAINT "FK_delivery_reviews_client_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_reviews" DROP CONSTRAINT "FK_delivery_reviews_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "delivery_reviews"`);

    await queryRunner.query(`DROP INDEX "public"."UQ_reviews_order_unit_only"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_reviews_order_product"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_product_id"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_unit_id"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_client_id"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_order_id"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
  }
}
