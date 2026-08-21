import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitIdToExpenses1787064315013 implements MigrationInterface {
  name = 'AddUnitIdToExpenses1787064315013';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "expenses" ADD "unit_id" integer`);

    // Backfill pre-existing expenses (created before unit scoping existed) to the first unit.
    await queryRunner.query(`
            UPDATE "expenses"
            SET "unit_id" = (SELECT "id" FROM "units" ORDER BY "id" ASC LIMIT 1)
            WHERE "unit_id" IS NULL
        `);

    await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "unit_id" SET NOT NULL`);
    await queryRunner.query(`
            ALTER TABLE "expenses"
            ADD CONSTRAINT "FK_expenses_unit_id" FOREIGN KEY ("unit_id")
            REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_expenses_unit_id"`);
    await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN "unit_id"`);
  }
}
