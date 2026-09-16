import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeliveryPersonSchema1786998623171 implements MigrationInterface {
  name = 'CreateDeliveryPersonSchema1786998623171';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "delivery_persons_status_enum" AS ENUM('PENDING', 'ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "delivery_persons_vehicle_enum" AS ENUM('MOTORCYCLE', 'BIKE', 'CAR', 'ON_FOOT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "vehicles_type_enum" AS ENUM('MOTORCYCLE', 'BIKE', 'CAR', 'SCOOTER')`,
    );

    await queryRunner.query(`
            CREATE TABLE "delivery_persons" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "vehicle" "delivery_persons_vehicle_enum" NOT NULL,
                "status" "delivery_persons_status_enum" NOT NULL DEFAULT 'PENDING',
                "average_rating" numeric(3,2),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_delivery_persons_user_id" UNIQUE ("user_id"),
                CONSTRAINT "PK_delivery_persons" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "delivery_persons"
            ADD CONSTRAINT "FK_delivery_persons_user_id" FOREIGN KEY ("user_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            CREATE TABLE "vehicles" (
                "id" SERIAL NOT NULL,
                "delivery_person_id" integer NOT NULL,
                "type" "vehicles_type_enum" NOT NULL,
                "model" character varying(80) NOT NULL,
                "plate" character varying(10) NOT NULL,
                "color" character varying(30) NOT NULL,
                "year" smallint NOT NULL,
                "is_active" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_vehicles" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "vehicles"
            ADD CONSTRAINT "FK_vehicles_delivery_person_id" FOREIGN KEY ("delivery_person_id")
            REFERENCES "delivery_persons"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_vehicles_active_per_person" ON "vehicles" ("delivery_person_id")
            WHERE "is_active" = true
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_vehicles_active_per_person"`);
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "FK_vehicles_delivery_person_id"`,
    );
    await queryRunner.query(`DROP TABLE "vehicles"`);

    await queryRunner.query(
      `ALTER TABLE "delivery_persons" DROP CONSTRAINT "FK_delivery_persons_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "delivery_persons"`);

    await queryRunner.query(`DROP TYPE "vehicles_type_enum"`);
    await queryRunner.query(`DROP TYPE "delivery_persons_vehicle_enum"`);
    await queryRunner.query(`DROP TYPE "delivery_persons_status_enum"`);
  }
}
