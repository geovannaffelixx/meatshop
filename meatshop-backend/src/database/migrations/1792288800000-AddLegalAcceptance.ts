import type { MigrationInterface, QueryRunner } from 'typeorm';
import documents from '../../legal/data/documents-2026-10-18.json';

export class AddLegalAcceptance1792288800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await this.createDocuments(queryRunner);
    await this.createAcceptances(queryRunner);
    await this.seedDocuments(queryRunner);
    await this.protectDocuments(queryRunner);
    await this.protectAcceptances(queryRunner);
  }

  private async createDocuments(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE legal_documents (
      id serial PRIMARY KEY, kind varchar(40) NOT NULL CHECK (kind IN ('PLATFORM_TERMS', 'PRIVACY_NOTICE', 'ESTABLISHMENT_TERMS')),
      version varchar(40) NOT NULL, title varchar(150) NOT NULL, content text NOT NULL,
      content_hash varchar(64) NOT NULL, published_at timestamptz NOT NULL, is_current boolean NOT NULL DEFAULT true,
      UNIQUE (kind, version)
    )`);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IDX_legal_current_kind ON legal_documents(kind) WHERE is_current',
    );
  }

  private async createAcceptances(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE legal_acceptances (
      id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      document_id integer NOT NULL REFERENCES legal_documents(id) ON DELETE RESTRICT,
      unit_id integer REFERENCES units(id) ON DELETE RESTRICT,
      channel varchar(10) NOT NULL CHECK (channel IN ('web', 'mobile')),
      authorized_representative boolean NOT NULL DEFAULT false,
      accepted_at timestamptz NOT NULL DEFAULT now(),
      CHECK (unit_id IS NULL OR authorized_representative)
    )`);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IDX_legal_user_document ON legal_acceptances(user_id, document_id) WHERE unit_id IS NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IDX_legal_unit_document ON legal_acceptances(user_id, document_id, unit_id) WHERE unit_id IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE INDEX IDX_legal_unit ON legal_acceptances(unit_id, document_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IDX_legal_history ON legal_acceptances(user_id, accepted_at DESC)',
    );
  }

  private async seedDocuments(queryRunner: QueryRunner): Promise<void> {
    for (const document of documents) {
      await queryRunner.query(
        `INSERT INTO legal_documents (kind, version, title, content, content_hash, published_at)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          document.kind,
          document.version,
          document.title,
          document.content,
          document.content_hash,
          document.published_at,
        ],
      );
    }
  }

  private async protectDocuments(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE FUNCTION protect_legal_document() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Legal document versions must be preserved'; END IF;
      IF (NEW.kind, NEW.version, NEW.title, NEW.content, NEW.content_hash, NEW.published_at)
        IS DISTINCT FROM (OLD.kind, OLD.version, OLD.title, OLD.content, OLD.content_hash, OLD.published_at)
      THEN RAISE EXCEPTION 'Legal document content is immutable'; END IF;
      RETURN NEW;
    END $$`);
    await queryRunner.query(
      'CREATE TRIGGER protect_legal_document BEFORE UPDATE OR DELETE ON legal_documents FOR EACH ROW EXECUTE FUNCTION protect_legal_document()',
    );
  }

  private async protectAcceptances(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE FUNCTION protect_legal_acceptance() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      RAISE EXCEPTION 'Legal acceptance records are append-only';
    END $$`);
    await queryRunner.query(
      'CREATE TRIGGER protect_legal_acceptance BEFORE UPDATE OR DELETE ON legal_acceptances FOR EACH ROW EXECUTE FUNCTION protect_legal_acceptance()',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE legal_acceptances');
    await queryRunner.query('DROP FUNCTION protect_legal_acceptance()');
    await queryRunner.query('DROP TABLE legal_documents');
    await queryRunner.query('DROP FUNCTION protect_legal_document()');
  }
}
