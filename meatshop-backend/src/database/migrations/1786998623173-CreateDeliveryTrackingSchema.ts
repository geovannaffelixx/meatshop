import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeliveryTrackingSchema1786998623173 implements MigrationInterface {
  name = 'CreateDeliveryTrackingSchema1786998623173';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "delivery_tracking" (
                "id" SERIAL NOT NULL,
                "order_id" integer NOT NULL,
                "latitude" numeric(10,7) NOT NULL,
                "longitude" numeric(10,7) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_delivery_tracking" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "delivery_tracking"
            ADD CONSTRAINT "FK_delivery_tracking_order_id" FOREIGN KEY ("order_id")
            REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery_tracking" DROP CONSTRAINT "FK_delivery_tracking_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "delivery_tracking"`);
  }
}
