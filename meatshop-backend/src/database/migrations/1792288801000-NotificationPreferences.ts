import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationPreferences1792288801000 implements MigrationInterface {
  name = 'NotificationPreferences1792288801000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "user_id" integer NOT NULL,
        "orders_enabled" boolean NOT NULL DEFAULT true,
        "delivery_enabled" boolean NOT NULL DEFAULT true,
        "promotions_enabled" boolean NOT NULL DEFAULT true,
        "system_enabled" boolean NOT NULL DEFAULT true,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("user_id"),
        CONSTRAINT "FK_notification_preferences_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
  }
}
