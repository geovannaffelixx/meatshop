import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EvolvePlatformSupport1787830000000 implements MigrationInterface {
  name = 'EvolvePlatformSupport1787830000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "support_tickets_category_enum" AS ENUM('ACCOUNT','BILLING','ORDER','TECHNICAL','SUGGESTION','OTHER')`);
    await queryRunner.query(`CREATE TYPE "support_tickets_priority_enum" AS ENUM('LOW','NORMAL','HIGH','URGENT')`);
    await queryRunner.query(`ALTER TYPE "support_tickets_status_enum" ADD VALUE IF NOT EXISTS 'WAITING_SUPPORT'`);
    await queryRunner.query(`ALTER TYPE "support_tickets_status_enum" ADD VALUE IF NOT EXISTS 'WAITING_USER'`);
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD "unit_id" integer`);
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD "order_id" integer`);
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD "assigned_to" integer`);
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD "category" "support_tickets_category_enum" NOT NULL DEFAULT 'OTHER'`);
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD "priority" "support_tickets_priority_enum" NOT NULL DEFAULT 'NORMAL'`);
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD "closed_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD "last_message_at" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
    await this.createMessages(queryRunner);
    await this.createAttachments(queryRunner);
    await this.addRelations(queryRunner);
    await queryRunner.query(`INSERT INTO "support_messages" ("ticket_id", "sender_id", "message", "created_at") SELECT "id", "user_id", "description", "created_at" FROM "support_tickets"`);
    await queryRunner.query(`INSERT INTO "support_messages" ("ticket_id", "sender_id", "message", "created_at") SELECT "id", "responded_by", "response", "responded_at" FROM "support_tickets" WHERE "response" IS NOT NULL AND "responded_by" IS NOT NULL`);
  }

  private async createMessages(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "support_messages" ("id" SERIAL NOT NULL, "ticket_id" integer NOT NULL, "sender_id" integer NOT NULL, "message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_support_messages" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "support_messages" ADD CONSTRAINT "FK_support_messages_ticket" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "support_messages" ADD CONSTRAINT "FK_support_messages_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT`);
  }

  private async createAttachments(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "support_attachments" ("id" SERIAL NOT NULL, "message_id" integer NOT NULL, "file_url" character varying(255) NOT NULL, "original_name" character varying(120) NOT NULL, "mime_type" character varying(50) NOT NULL, "size_bytes" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_support_attachments" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "support_attachments" ADD CONSTRAINT "FK_support_attachments_message" FOREIGN KEY ("message_id") REFERENCES "support_messages"("id") ON DELETE CASCADE`);
  }

  private async addRelations(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_support_tickets_unit" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_support_tickets_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_support_tickets_assignee" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_support_tickets_queue" ON "support_tickets" ("status", "priority", "last_message_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_support_messages_ticket_created" ON "support_messages" ("ticket_id", "created_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_support_messages_ticket_created"`);
    await queryRunner.query(`DROP INDEX "IDX_support_tickets_queue"`);
    await queryRunner.query(`DROP TABLE "support_attachments"`);
    await queryRunner.query(`DROP TABLE "support_messages"`);
    for (const relation of ['assignee', 'order', 'unit']) await queryRunner.query(`ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_support_tickets_${relation}"`);
    for (const column of ['updated_at','last_message_at','closed_at','priority','category','assigned_to','order_id','unit_id']) await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "${column}"`);
    await queryRunner.query(`DROP TYPE "support_tickets_priority_enum"`);
    await queryRunner.query(`DROP TYPE "support_tickets_category_enum"`);
  }
}
