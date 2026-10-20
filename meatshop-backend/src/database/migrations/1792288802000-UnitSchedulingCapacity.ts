import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UnitSchedulingCapacity1792288802000 implements MigrationInterface {
  name = 'UnitSchedulingCapacity1792288802000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "units" ADD "scheduling_slot_minutes" integer`);
    await queryRunner.query(`ALTER TABLE "units" ADD "scheduling_capacity" integer`);
    await queryRunner.query(`
      ALTER TABLE "units"
      ADD CONSTRAINT "CHK_units_scheduling_configuration"
      CHECK (
        ("scheduling_slot_minutes" IS NULL AND "scheduling_capacity" IS NULL)
        OR
        ("scheduling_slot_minutes" BETWEEN 5 AND 240 AND "scheduling_capacity" BETWEEN 1 AND 1000)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "units" DROP CONSTRAINT "CHK_units_scheduling_configuration"`,
    );
    await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "scheduling_capacity"`);
    await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "scheduling_slot_minutes"`);
  }
}
