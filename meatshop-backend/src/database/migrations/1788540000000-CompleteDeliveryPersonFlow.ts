import { MigrationInterface, QueryRunner } from "typeorm";

export class CompleteDeliveryPersonFlow1788540000000
  implements MigrationInterface
{
  name = "CompleteDeliveryPersonFlow1788540000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery_persons" ADD COLUMN "is_online" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_persons" ADD COLUMN "availability_updated_at" TIMESTAMP NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD COLUMN "is_enabled" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `CREATE TABLE "delivery_offer_rejections" ("id" SERIAL NOT NULL, "delivery_person_id" integer NOT NULL, "order_id" integer NOT NULL, "reasons" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_delivery_offer_rejection" UNIQUE ("delivery_person_id", "order_id"), CONSTRAINT "PK_delivery_offer_rejections" PRIMARY KEY ("id"), CONSTRAINT "FK_delivery_offer_rejection_person" FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_persons"("id") ON DELETE CASCADE, CONSTRAINT "FK_delivery_offer_rejection_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE TYPE "delivery_goals_period_enum" AS ENUM ('daily', 'weekly', 'monthly')`,
    );
    await queryRunner.query(
      `CREATE TABLE "delivery_goals" ("id" SERIAL NOT NULL, "delivery_person_id" integer NOT NULL, "period" "delivery_goals_period_enum" NOT NULL, "target" numeric(10,2) NOT NULL, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_delivery_goal_period" UNIQUE ("delivery_person_id", "period"), CONSTRAINT "PK_delivery_goals" PRIMARY KEY ("id"), CONSTRAINT "FK_delivery_goal_person" FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_persons"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_delivery_tracking_order_created" ON "delivery_tracking" ("order_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_tracking" ADD COLUMN "accuracy" numeric(7,2) NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery_tracking" DROP COLUMN "accuracy"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_delivery_tracking_order_created"`);
    await queryRunner.query(`DROP TABLE "delivery_goals"`);
    await queryRunner.query(`DROP TYPE "delivery_goals_period_enum"`);
    await queryRunner.query(`DROP TABLE "delivery_offer_rejections"`);
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "is_enabled"`);
    await queryRunner.query(
      `ALTER TABLE "delivery_persons" DROP COLUMN "availability_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_persons" DROP COLUMN "is_online"`,
    );
  }
}
