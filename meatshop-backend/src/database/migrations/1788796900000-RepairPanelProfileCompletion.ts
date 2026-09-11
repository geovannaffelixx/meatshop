import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairPanelProfileCompletion1788796900000 implements MigrationInterface {
  name = 'RepairPanelProfileCompletion1788796900000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "profile_complete" = true WHERE "profile_complete" = false AND EXISTS (SELECT 1 FROM "user_units" WHERE "user_units"."user_id" = "users"."id" AND "user_units"."status" = 'ACTIVE')`,
    );
  }

  async down(): Promise<void> {}
}
