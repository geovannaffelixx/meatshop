import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { LegalDocument } from '../src/legal/entities/legal-document.entity';
import { LegalAcceptance } from '../src/legal/entities/legal-acceptance.entity';
import { LegalRepository } from '../src/legal/repositories/legal.repository';
import { LegalPolicyService } from '../src/legal/services/legal-policy.service';
import { RecordLegalAcceptanceUseCase } from '../src/legal/use-cases/record-legal-acceptance.use-case';
import { AddLegalAcceptance1792288800000 } from '../src/database/migrations/1792288800000-AddLegalAcceptance';

const enabled = process.env.LEGAL_TEST_DATABASE === 'meatshop_legal_test';
(enabled ? describe : describe.skip)('Legal acceptance with isolated PostgreSQL', () => {
  let db: DataSource;
  let policy: LegalPolicyService;
  let repository: LegalRepository;
  let record: RecordLegalAcceptanceUseCase;
  const migration = new AddLegalAcceptance1792288800000();
  let initialized = false;
  const general = { accepted: true as const, channel: 'mobile' as const, document_ids: [1, 2] };

  beforeAll(async () => {
    db = new DataSource({
      type: 'postgres',
      host: '127.0.0.1',
      port: Number(process.env.E2E_DB_PORT ?? 5433),
      username: 'meatshop_user',
      password: 'meatshop_pass',
      database: 'meatshop_legal_test',
      entities: [LegalDocument, LegalAcceptance],
      synchronize: false,
    });
    await db.initialize();
    const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    if (tables.length) throw new Error('The isolated legal test database must be empty');
    await db.query(
      'CREATE TABLE users (id serial PRIMARY KEY, name text); CREATE TABLE units (id serial PRIMARY KEY, admin_id integer REFERENCES users(id))',
    );
    await migration.up(db.createQueryRunner());
    initialized = true;
    await db.query(
      "INSERT INTO users (id, name) VALUES (1, 'Owner'), (2, 'Client'); INSERT INTO units (id, admin_id) VALUES (1, 1), (2, 1)",
    );
    repository = new LegalRepository(db);
    policy = new LegalPolicyService(
      repository,
      new ConfigService({ LEGAL_ACCEPTANCE_REQUIRED: 'true' }),
    );
    record = new RecordLegalAcceptanceUseCase(repository, policy);
  });

  afterAll(async () => {
    if (initialized) {
      await migration.down(db.createQueryRunner());
      await db.query('DROP TABLE units; DROP TABLE users');
    }
    if (db?.isInitialized) await db.destroy();
  });

  it('preserves content and validates published hashes', async () => {
    for (const document of await repository.current()) {
      expect(createHash('sha256').update(document.content).digest('hex')).toBe(
        document.content_hash,
      );
    }
    await expect(
      db.query("UPDATE legal_documents SET content = 'changed' WHERE id = 1"),
    ).rejects.toThrow('immutable');
    await expect(db.query('DELETE FROM legal_documents WHERE id = 1')).rejects.toThrow('preserved');
  });

  it('keeps user creation and acceptance in the same transaction', async () => {
    await expect(
      db.transaction(async (manager) => {
        await manager.query("INSERT INTO users (id, name) VALUES (3, 'Rollback')");
        await policy.record(manager, 3, general);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(await db.query('SELECT id FROM users WHERE id = 3')).toHaveLength(0);
    expect(await repository.history(3)).toHaveLength(0);
  });

  it('records concurrent retries once and uses the server timestamp', async () => {
    await Promise.all([record.execute(2, general), record.execute(2, general)]);
    const history = await repository.history(2);
    expect(history).toHaveLength(2);
    expect(history[0].accepted_at).toBeInstanceOf(Date);
    await expect(policy.assertUser(2)).resolves.toBeUndefined();
    await expect(policy.assertUnit(1)).rejects.toThrow();
  });

  it('binds establishment acceptance to the actor and each unit', async () => {
    const dto = {
      ...general,
      channel: 'web' as const,
      document_ids: [1, 2, 3],
      authorized_representative: true as const,
      unit_id: 1,
    };
    await expect(record.execute(2, dto)).rejects.toThrow('responsável');
    await record.execute(1, dto);
    await expect(policy.assertUnit(1)).resolves.toBeUndefined();
    await expect(policy.assertUnit(2)).rejects.toThrow();
    expect(
      (await repository.history(1)).filter(
        (item: { unit_id: number | null }) => item.unit_id === 1,
      ),
    ).toHaveLength(1);
  });

  it('requires a new acceptance after a material update and retains the old version', async () => {
    await db.transaction(async (manager) => {
      await manager.query('UPDATE legal_documents SET is_current = false WHERE id = 1');
      await manager.query(`INSERT INTO legal_documents (kind, version, title, content, content_hash, published_at)
        SELECT kind, 'next', title, content, content_hash, now() FROM legal_documents WHERE id = 1`);
    });
    await expect(policy.assertUser(2)).rejects.toThrow();
    await expect(record.execute(2, general)).rejects.toThrow('atualizados');
    expect(await repository.document(1)).toMatchObject({ is_current: false });
    expect(await repository.history(2)).toHaveLength(2);
  });
});
