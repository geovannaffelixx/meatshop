import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatReadReceipts1788100000000 implements MigrationInterface {
  name = 'AddChatReadReceipts1788100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE chat_messages ADD read_at TIMESTAMP`);
    await queryRunner.query(
      `CREATE INDEX IDX_chat_messages_unread ON chat_messages (order_id, participant_type, receiver_id, read_at)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX public.IDX_chat_messages_unread`);
    await queryRunner.query(`ALTER TABLE chat_messages DROP COLUMN read_at`);
  }
}
