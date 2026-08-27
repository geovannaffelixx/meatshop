import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EvolveCouponsDomain1787930000000 implements MigrationInterface {
  name = 'EvolveCouponsDomain1787930000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "coupons_type_enum" AS ENUM('PLATFORM','UNIT')`);
    await queryRunner.query(
      `CREATE TYPE "coupons_discount_type_enum" AS ENUM('PERCENTAGE','FIXED')`,
    );
    await queryRunner.query(`ALTER TABLE "coupons" ADD "name" character varying(120)`);
    await queryRunner.query(`ALTER TABLE "coupons" ADD "description" text`);
    await queryRunner.query(
      `ALTER TABLE "coupons" ADD "type" "coupons_type_enum" NOT NULL DEFAULT 'PLATFORM'`,
    );
    await queryRunner.query(`ALTER TABLE "coupons" ADD "unit_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "coupons" ADD "discount_type" "coupons_discount_type_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "coupons" ADD "discount_amount" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "coupons" ADD "maximum_discount" numeric(10,2)`);
    await queryRunner.query(
      `ALTER TABLE "coupons" ADD "minimum_order_value" numeric(10,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "coupons" ADD "starts_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "coupons" ADD "total_usage_limit" integer`);
    await queryRunner.query(`ALTER TABLE "coupons" ADD "usage_limit_per_user" integer`);
    await queryRunner.query(
      `ALTER TABLE "coupons" ADD "current_usage_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "coupons" ADD "created_by" integer`);
    await queryRunner.query(
      `ALTER TABLE "coupons" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "coupons" SET "name" = "code", "discount_type" = CASE WHEN "discount_percentage" IS NOT NULL THEN 'PERCENTAGE'::"coupons_discount_type_enum" ELSE 'FIXED'::"coupons_discount_type_enum" END, "discount_amount" = COALESCE("discount_percentage", "discount_value"), "created_by" = (SELECT "id" FROM "users" ORDER BY CASE WHEN "global_role" = 'SUPER_ADMIN' THEN 0 ELSE 1 END, "id" LIMIT 1)`,
    );
    await queryRunner.query(`ALTER TABLE "coupons" ALTER COLUMN "name" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "coupons" ALTER COLUMN "discount_type" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "coupons" ALTER COLUMN "discount_amount" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "coupons" ALTER COLUMN "created_by" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "discount_percentage"`);
    await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "discount_value"`);
    await queryRunner.query(
      `ALTER TABLE "coupons" ADD CONSTRAINT "FK_coupons_unit" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "coupons" ADD CONSTRAINT "FK_coupons_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `CREATE TABLE "coupon_units" ("coupon_id" integer NOT NULL, "unit_id" integer NOT NULL, CONSTRAINT "PK_coupon_units" PRIMARY KEY ("coupon_id","unit_id"), CONSTRAINT "FK_coupon_units_coupon" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE, CONSTRAINT "FK_coupon_units_unit" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE TYPE "coupon_redemptions_status_enum" AS ENUM('REDEEMED','RELEASED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "coupon_redemptions" ("id" SERIAL NOT NULL, "coupon_id" integer NOT NULL, "user_id" integer NOT NULL, "order_id" integer NOT NULL, "unit_id" integer NOT NULL, "discount_amount" numeric(10,2) NOT NULL, "status" "coupon_redemptions_status_enum" NOT NULL DEFAULT 'REDEEMED', "redeemed_at" TIMESTAMP NOT NULL DEFAULT now(), "released_at" TIMESTAMP, CONSTRAINT "PK_coupon_redemptions" PRIMARY KEY ("id"), CONSTRAINT "UQ_coupon_redemptions_order" UNIQUE ("order_id"), CONSTRAINT "FK_redemption_coupon" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT, CONSTRAINT "FK_redemption_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT, CONSTRAINT "FK_redemption_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT, CONSTRAINT "FK_redemption_unit" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_coupon_redemptions_usage" ON "coupon_redemptions" ("coupon_id","user_id","status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_coupons_scope_active" ON "coupons" ("type","unit_id","active")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_coupons_scope_active"`);
    await queryRunner.query(`DROP TABLE "coupon_redemptions"`);
    await queryRunner.query(`DROP TYPE "coupon_redemptions_status_enum"`);
    await queryRunner.query(`DROP TABLE "coupon_units"`);
    await queryRunner.query(`ALTER TABLE "coupons" ADD "discount_percentage" numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE "coupons" ADD "discount_value" numeric(10,2)`);
    await queryRunner.query(
      `UPDATE "coupons" SET "discount_percentage" = CASE WHEN "discount_type" = 'PERCENTAGE' THEN "discount_amount" END, "discount_value" = CASE WHEN "discount_type" = 'FIXED' THEN "discount_amount" END`,
    );
    await queryRunner.query(`ALTER TABLE "coupons" DROP CONSTRAINT "FK_coupons_creator"`);
    await queryRunner.query(`ALTER TABLE "coupons" DROP CONSTRAINT "FK_coupons_unit"`);
    for (const column of [
      'updated_at',
      'created_by',
      'current_usage_count',
      'usage_limit_per_user',
      'total_usage_limit',
      'starts_at',
      'minimum_order_value',
      'maximum_discount',
      'discount_amount',
      'discount_type',
      'unit_id',
      'type',
      'description',
      'name',
    ])
      await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "${column}"`);
    await queryRunner.query(`DROP TYPE "coupons_discount_type_enum"`);
    await queryRunner.query(`DROP TYPE "coupons_type_enum"`);
  }
}
