import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SupportAutonomousDeliveryPeople1788630000000 implements MigrationInterface {
  name = 'SupportAutonomousDeliveryPeople1788630000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "delivery_persons_affiliation_type_enum" AS ENUM ('AUTONOMOUS', 'UNIT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_persons" ADD COLUMN "affiliation_type" "delivery_persons_affiliation_type_enum" NOT NULL DEFAULT 'AUTONOMOUS'`,
    );
    await queryRunner.query(
      `UPDATE "delivery_persons" AS person SET "affiliation_type" = 'UNIT' WHERE EXISTS (SELECT 1 FROM "user_units" AS membership WHERE membership."user_id" = person."user_id" AND membership."local_role" = 'DELIVERY')`,
    );
    await queryRunner.query(
      `UPDATE "delivery_persons" SET "status" = 'ACTIVE' WHERE "affiliation_type" = 'AUTONOMOUS' AND "status" = 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN "photo_urls" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "photo_urls"`);
    await queryRunner.query(`ALTER TABLE "delivery_persons" DROP COLUMN "affiliation_type"`);
    await queryRunner.query(`DROP TYPE "delivery_persons_affiliation_type_enum"`);
  }
}
