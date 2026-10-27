import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FunctionalGapsHardening1792288803000 implements MigrationInterface {
  name = 'FunctionalGapsHardening1792288803000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "promotions" ADD "notification_sent_at" timestamptz`);
    // Existing live campaigns must not be announced again when this version starts.
    await queryRunner.query(
      `UPDATE "promotions" SET "notification_sent_at" = now() WHERE "active" = true AND "starts_at" <= now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "units" DROP CONSTRAINT "CHK_units_scheduling_configuration"`,
    );
    await queryRunner.query(`ALTER TABLE "units" ADD CONSTRAINT "CHK_units_scheduling_configuration" CHECK (
      ("scheduling_slot_minutes" IS NULL AND "scheduling_capacity" IS NULL) OR
      ("scheduling_slot_minutes" IS NOT NULL AND "scheduling_capacity" IS NOT NULL
       AND "scheduling_slot_minutes" BETWEEN 5 AND 240 AND "scheduling_capacity" BETWEEN 1 AND 1000)
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_schedule_capacity" ON "orders" ("unit_id", "scheduled_delivery_date") WHERE "is_scheduled" = true AND "status" <> 'CANCELLED'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_orders_schedule_capacity"`);
    await queryRunner.query(
      `ALTER TABLE "units" DROP CONSTRAINT "CHK_units_scheduling_configuration"`,
    );
    await queryRunner.query(`ALTER TABLE "units" ADD CONSTRAINT "CHK_units_scheduling_configuration" CHECK (
      ("scheduling_slot_minutes" IS NULL AND "scheduling_capacity" IS NULL) OR
      ("scheduling_slot_minutes" BETWEEN 5 AND 240 AND "scheduling_capacity" BETWEEN 1 AND 1000)
    )`);
    await queryRunner.query(`ALTER TABLE "promotions" DROP COLUMN "notification_sent_at"`);
  }
}
