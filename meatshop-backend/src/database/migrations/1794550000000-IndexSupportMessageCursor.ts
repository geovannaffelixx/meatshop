import type { MigrationInterface, QueryRunner } from 'typeorm';
export class IndexSupportMessageCursor1794550000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      'CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_cursor ON support_messages(ticket_id,id DESC)',
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP INDEX IF EXISTS idx_support_messages_ticket_cursor');
  }
}
