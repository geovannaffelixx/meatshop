import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupportTicketsSchema1787060357899 implements MigrationInterface {
  name = 'CreateSupportTicketsSchema1787060357899';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "support_tickets_status_enum" AS ENUM('OPEN', 'ANSWERED', 'CLOSED')`,
    );
    await queryRunner.query(`
            CREATE TABLE "support_tickets" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "subject" character varying(150) NOT NULL,
                "description" text NOT NULL,
                "status" "support_tickets_status_enum" NOT NULL DEFAULT 'OPEN',
                "response" text,
                "responded_by" integer,
                "responded_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_support_tickets" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "support_tickets"
            ADD CONSTRAINT "FK_support_tickets_user_id" FOREIGN KEY ("user_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "support_tickets"
            ADD CONSTRAINT "FK_support_tickets_responded_by" FOREIGN KEY ("responded_by")
            REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_support_tickets_responded_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_support_tickets_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "support_tickets"`);
    await queryRunner.query(`DROP TYPE "support_tickets_status_enum"`);
  }
}
