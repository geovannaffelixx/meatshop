import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebNotificationContext1787750000000 implements MigrationInterface {
  name = 'AddWebNotificationContext1787750000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications" ADD "unit_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "title" character varying(120) NOT NULL DEFAULT 'MeatShop'`,
    );
    await queryRunner.query(`ALTER TABLE "notifications" ADD "action_url" character varying(255)`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_unit_id" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_notifications_user_unit_created" ON "notifications" ("user_id", "unit_id", "created_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_notifications_user_unit_created"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_unit_id"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "action_url"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "title"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "unit_id"`);
  }
}
