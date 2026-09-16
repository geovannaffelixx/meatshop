import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBusinessHoursSchema1787070916094 implements MigrationInterface {
  name = 'CreateBusinessHoursSchema1787070916094';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "business_hours_weekday_enum" AS ENUM(
                'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "business_hours" (
                "id" SERIAL NOT NULL,
                "unit_id" integer NOT NULL,
                "weekday" "business_hours_weekday_enum" NOT NULL,
                "opening_time" TIME,
                "closing_time" TIME,
                "is_open" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_business_hours" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "business_hours"
            ADD CONSTRAINT "FK_business_hours_unit_id" FOREIGN KEY ("unit_id")
            REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_business_hours_unit_id_weekday" ON "business_hours" ("unit_id", "weekday")
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_business_hours_unit_id_weekday"`);
    await queryRunner.query(
      `ALTER TABLE "business_hours" DROP CONSTRAINT "FK_business_hours_unit_id"`,
    );
    await queryRunner.query(`DROP TABLE "business_hours"`);
    await queryRunner.query(`DROP TYPE "business_hours_weekday_enum"`);
  }
}
