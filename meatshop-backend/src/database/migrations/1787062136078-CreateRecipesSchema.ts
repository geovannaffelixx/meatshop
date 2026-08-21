import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecipesSchema1787062136078 implements MigrationInterface {
  name = 'CreateRecipesSchema1787062136078';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "recipes" (
                "id" SERIAL NOT NULL,
                "unit_id" integer NOT NULL,
                "title" character varying(150) NOT NULL,
                "description" text NOT NULL,
                "image_url" character varying,
                "video_url" character varying,
                "tag" character varying(50),
                "active" boolean NOT NULL DEFAULT true,
                "display_order" integer NOT NULL DEFAULT 0,
                "week_start" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_recipes" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "recipes"
            ADD CONSTRAINT "FK_recipes_unit_id" FOREIGN KEY ("unit_id")
            REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            CREATE TABLE "recipe_steps" (
                "id" SERIAL NOT NULL,
                "recipe_id" integer NOT NULL,
                "step_number" integer NOT NULL,
                "description" text NOT NULL,
                "tip" text,
                CONSTRAINT "PK_recipe_steps" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "recipe_steps"
            ADD CONSTRAINT "FK_recipe_steps_recipe_id" FOREIGN KEY ("recipe_id")
            REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_recipe_steps_recipe_id_step_number" ON "recipe_steps" ("recipe_id", "step_number")
        `);

    await queryRunner.query(`
            CREATE TABLE "recipe_ingredients" (
                "id" SERIAL NOT NULL,
                "recipe_id" integer NOT NULL,
                "name" character varying(150) NOT NULL,
                "quantity" character varying(50) NOT NULL,
                "tip" character varying,
                CONSTRAINT "PK_recipe_ingredients" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "recipe_ingredients"
            ADD CONSTRAINT "FK_recipe_ingredients_recipe_id" FOREIGN KEY ("recipe_id")
            REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            CREATE TABLE "recipe_products" (
                "id" SERIAL NOT NULL,
                "recipe_id" integer NOT NULL,
                "product_id" integer NOT NULL,
                "call_to_action" character varying(255) NOT NULL,
                CONSTRAINT "PK_recipe_products" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "recipe_products"
            ADD CONSTRAINT "FK_recipe_products_recipe_id" FOREIGN KEY ("recipe_id")
            REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "recipe_products"
            ADD CONSTRAINT "FK_recipe_products_product_id" FOREIGN KEY ("product_id")
            REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_recipe_products_recipe_id_product_id" ON "recipe_products" ("recipe_id", "product_id")
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_recipe_products_recipe_id_product_id"`);
    await queryRunner.query(
      `ALTER TABLE "recipe_products" DROP CONSTRAINT "FK_recipe_products_product_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe_products" DROP CONSTRAINT "FK_recipe_products_recipe_id"`,
    );
    await queryRunner.query(`DROP TABLE "recipe_products"`);

    await queryRunner.query(
      `ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "FK_recipe_ingredients_recipe_id"`,
    );
    await queryRunner.query(`DROP TABLE "recipe_ingredients"`);

    await queryRunner.query(`DROP INDEX "public"."UQ_recipe_steps_recipe_id_step_number"`);
    await queryRunner.query(
      `ALTER TABLE "recipe_steps" DROP CONSTRAINT "FK_recipe_steps_recipe_id"`,
    );
    await queryRunner.query(`DROP TABLE "recipe_steps"`);

    await queryRunner.query(`ALTER TABLE "recipes" DROP CONSTRAINT "FK_recipes_unit_id"`);
    await queryRunner.query(`DROP TABLE "recipes"`);
  }
}
