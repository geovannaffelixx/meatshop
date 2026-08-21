import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatMessagesSchema1787232740983 implements MigrationInterface {
  name = 'CreateChatMessagesSchema1787232740983';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "chat_messages_participant_type_enum" AS ENUM('UNIT', 'DELIVERY_PERSON')
        `);
    await queryRunner.query(`
            CREATE TABLE "chat_messages" (
                "id" SERIAL NOT NULL,
                "order_id" integer NOT NULL,
                "sender_id" integer NOT NULL,
                "receiver_id" integer NOT NULL,
                "participant_type" "chat_messages_participant_type_enum" NOT NULL,
                "message" text NOT NULL,
                "sent_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_chat_messages" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "FK_chat_messages_order_id" FOREIGN KEY ("order_id")
            REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "FK_chat_messages_sender_id" FOREIGN KEY ("sender_id")
            REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "chat_messages"
            ADD CONSTRAINT "FK_chat_messages_receiver_id" FOREIGN KEY ("receiver_id")
            REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_chat_messages_order_participant" ON "chat_messages" ("order_id", "participant_type")
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_chat_messages_order_participant"`);
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_chat_messages_receiver_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_chat_messages_sender_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_chat_messages_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "chat_messages"`);
    await queryRunner.query(`DROP TYPE "chat_messages_participant_type_enum"`);
  }
}
