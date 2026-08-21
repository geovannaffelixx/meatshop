import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSavedPaymentMethodsSchema1787063084784 implements MigrationInterface {
  name = 'CreateSavedPaymentMethodsSchema1787063084784';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "saved_payment_methods" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "mp_card_id" character varying(60) NOT NULL,
                "mp_customer_id" character varying(60) NOT NULL,
                "brand" character varying(30) NOT NULL,
                "last_four" character varying(4) NOT NULL,
                "holder_name" character varying(150) NOT NULL,
                "expiration_month" character varying(2) NOT NULL,
                "expiration_year" character varying(4) NOT NULL,
                "is_default" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_saved_payment_methods" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "saved_payment_methods"
            ADD CONSTRAINT "FK_saved_payment_methods_user_id" FOREIGN KEY ("user_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_saved_payment_methods_mp_customer_card" ON "saved_payment_methods" ("mp_customer_id", "mp_card_id")
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_saved_payment_methods_mp_customer_card"`);
    await queryRunner.query(
      `ALTER TABLE "saved_payment_methods" DROP CONSTRAINT "FK_saved_payment_methods_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "saved_payment_methods"`);
  }
}
