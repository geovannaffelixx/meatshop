import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RefreshIdentitySession1793300005000 implements MigrationInterface {
  name = 'RefreshIdentitySession1793300005000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      'ALTER TABLE refresh_tokens ADD COLUMN authenticated_at timestamp NOT NULL DEFAULT now()',
    );
    await runner.query('UPDATE refresh_tokens SET authenticated_at=created_at');
    // Legacy rotations did not retain their original authentication time.
    await runner.query(
      'UPDATE refresh_tokens SET revoked=true WHERE user_id IN (SELECT id FROM users WHERE firebase_uid IS NOT NULL)',
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE refresh_tokens DROP COLUMN authenticated_at');
  }
}
