import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceUnitLocalRoles1787400000000 implements MigrationInterface {
  name = 'ReplaceUnitLocalRoles1787400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_units" ADD COLUMN "_was_owner" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`
      UPDATE "user_units" membership
      SET "_was_owner" = true
      FROM "units" unit
      WHERE unit."id" = membership."unit_id"
        AND unit."admin_id" = membership."user_id"
        AND membership."local_role"::text = 'ADMIN'
    `);
    await queryRunner.query(
      `ALTER TYPE "user_units_local_role_enum" RENAME TO "user_units_local_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "user_units_local_role_enum" AS ENUM('OWNER', 'MANAGER', 'OPERATOR', 'DELIVERY')`,
    );
    await queryRunner.query(`
      ALTER TABLE "user_units"
      ALTER COLUMN "local_role" TYPE "user_units_local_role_enum"
      USING (
        CASE
          WHEN "local_role"::text = 'ADMIN' AND "_was_owner" THEN 'OWNER'
          WHEN "local_role"::text = 'ADMIN' THEN 'MANAGER'
          WHEN "local_role"::text = 'MEMBER' THEN 'OPERATOR'
          ELSE "local_role"::text
        END
      )::"user_units_local_role_enum"
    `);
    await queryRunner.query(`ALTER TABLE "user_units" DROP COLUMN "_was_owner"`);
    await queryRunner.query(`DROP TYPE "user_units_local_role_enum_old"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_units_user_status" ON "user_units" ("user_id", "status")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_units_user_status"`);
    await queryRunner.query(
      `ALTER TYPE "user_units_local_role_enum" RENAME TO "user_units_local_role_enum_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "user_units_local_role_enum" AS ENUM('ADMIN', 'MEMBER', 'DELIVERY')`,
    );
    await queryRunner.query(`
      ALTER TABLE "user_units"
      ALTER COLUMN "local_role" TYPE "user_units_local_role_enum"
      USING (
        CASE
          WHEN "local_role"::text IN ('OWNER', 'MANAGER') THEN 'ADMIN'
          WHEN "local_role"::text = 'OPERATOR' THEN 'MEMBER'
          ELSE "local_role"::text
        END
      )::"user_units_local_role_enum"
    `);
    await queryRunner.query(`DROP TYPE "user_units_local_role_enum_new"`);
  }
}
