import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiConversations1791518400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE ai_conversations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    )`);
    await queryRunner.query('CREATE INDEX IDX_ai_conversations_user ON ai_conversations(user_id)');
    await queryRunner.query(
      'CREATE INDEX IDX_ai_conversations_retention ON ai_conversations(expires_at)',
    );

    await queryRunner.query(`CREATE TABLE ai_messages (
      id bigserial PRIMARY KEY,
      conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role varchar(10) NOT NULL CHECK (role IN ('user', 'assistant')),
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      'CREATE INDEX IDX_ai_messages_history ON ai_messages(conversation_id, created_at)',
    );

    await queryRunner.query(`CREATE TABLE ai_rate_limits (
      user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      window_started_at timestamptz NOT NULL DEFAULT now(),
      request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE ai_rate_limits');
    await queryRunner.query('DROP TABLE ai_messages');
    await queryRunner.query('DROP TABLE ai_conversations');
  }
}
