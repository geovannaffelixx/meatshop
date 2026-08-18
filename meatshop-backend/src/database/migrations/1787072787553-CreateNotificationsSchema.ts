import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsSchema1787072787553 implements MigrationInterface {
  name = 'CreateNotificationsSchema1787072787553';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "notifications_type_enum" AS ENUM('ORDER', 'DELIVERY', 'PROMOTION', 'SYSTEM')
        `);
    await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "message" text NOT NULL,
                "type" "notifications_type_enum" NOT NULL,
                "read" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications"
            ADD CONSTRAINT "FK_notifications_user_id" FOREIGN KEY ("user_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            CREATE TABLE "user_device_tokens" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "fcm_token" character varying(300) NOT NULL,
                "platform" character varying(20) NOT NULL DEFAULT 'WEB',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "last_seen_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_device_tokens" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_user_device_tokens_fcm_token" UNIQUE ("fcm_token")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "user_device_tokens"
            ADD CONSTRAINT "FK_user_device_tokens_user_id" FOREIGN KEY ("user_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_device_tokens" DROP CONSTRAINT "FK_user_device_tokens_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "user_device_tokens"`);

    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user_id"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notifications_type_enum"`);
  }
}
