import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LegalRevocation1793300003000 implements MigrationInterface {
  name = 'LegalRevocation1793300003000';
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      "ALTER TABLE legal_acceptances ADD COLUMN event_type varchar(10) NOT NULL DEFAULT 'ACCEPTED' CHECK (event_type IN ('ACCEPTED','REVOKED'))",
    );
    await runner.query(
      'ALTER TABLE legal_documents ADD COLUMN is_revocable boolean NOT NULL DEFAULT false',
    );
    await runner.query(
      "UPDATE legal_documents SET is_revocable=true WHERE kind IN ('PLATFORM_TERMS','ESTABLISHMENT_TERMS')",
    );
    await runner.query('DROP INDEX IDX_legal_user_document');
    await runner.query('DROP INDEX IDX_legal_unit_document');
    await runner.query(
      'CREATE INDEX IDX_legal_effective_acceptance ON legal_acceptances(user_id,document_id,unit_id,id DESC)',
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    const [row] = await runner.query(
      "SELECT EXISTS(SELECT 1 FROM legal_acceptances WHERE event_type='REVOKED') AS exists",
    );
    if (row.exists)
      throw new Error('Cannot discard append-only revocation history; preserve the current schema');
    await runner.query('DROP INDEX IDX_legal_effective_acceptance');
    await runner.query('ALTER TABLE legal_acceptances DROP COLUMN event_type');
    await runner.query('ALTER TABLE legal_documents DROP COLUMN is_revocable');
    await runner.query(
      'CREATE UNIQUE INDEX IDX_legal_user_document ON legal_acceptances(user_id,document_id) WHERE unit_id IS NULL',
    );
    await runner.query(
      'CREATE UNIQUE INDEX IDX_legal_unit_document ON legal_acceptances(user_id,document_id,unit_id) WHERE unit_id IS NOT NULL',
    );
  }
}
