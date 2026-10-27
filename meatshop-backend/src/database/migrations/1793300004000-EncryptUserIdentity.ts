import type { MigrationInterface, QueryRunner } from 'typeorm';
import { FieldEncryption } from '../../common/security/field-encryption';

export class EncryptUserIdentity1793300004000 implements MigrationInterface {
  name = 'EncryptUserIdentity1793300004000';

  async up(runner: QueryRunner): Promise<void> {
    const encryption = FieldEncryption.fromEnvironment(process.env);
    await runner.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS "UQ_users_cpf"');
    await runner.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS "UQ_users_phone"');
    await runner.query('DROP INDEX IF EXISTS "UQ_users_phone"');
    await runner.query(
      'ALTER TABLE users ADD COLUMN cpf_hash varchar(64), ADD COLUMN phone_hash varchar(64)',
    );
    await this.transform(runner, encryption, true);
    await runner.query('CREATE UNIQUE INDEX "UQ_users_cpf_hash" ON users(cpf_hash)');
    await runner.query('CREATE UNIQUE INDEX "UQ_users_phone_hash" ON users(phone_hash)');
  }

  async down(runner: QueryRunner): Promise<void> {
    await this.transform(runner, FieldEncryption.fromEnvironment(process.env), false);
    await runner.query('DROP INDEX "UQ_users_cpf_hash"');
    await runner.query('DROP INDEX "UQ_users_phone_hash"');
    await runner.query('ALTER TABLE users DROP COLUMN cpf_hash, DROP COLUMN phone_hash');
    await runner.query('ALTER TABLE users ADD CONSTRAINT "UQ_users_cpf" UNIQUE(cpf)');
    await runner.query(
      'CREATE UNIQUE INDEX "UQ_users_phone" ON users(phone) WHERE phone IS NOT NULL',
    );
  }

  private async transform(
    runner: QueryRunner,
    cipher: FieldEncryption,
    encrypt: boolean,
  ): Promise<void> {
    let cursor = 0;
    while (true) {
      const rows: { id: number; cpf: string | null; phone: string | null }[] = await runner.query(
        'SELECT id,cpf,phone FROM users WHERE id>$1 ORDER BY id LIMIT 500 FOR UPDATE',
        [cursor],
      );
      if (!rows.length) return;
      for (const row of rows) {
        const cpf = row.cpf === null ? null : cipher.decrypt(row.cpf);
        const phone = row.phone === null ? null : cipher.decrypt(row.phone);
        if (encrypt)
          await runner.query(
            'UPDATE users SET cpf=$2,phone=$3,cpf_hash=$4,phone_hash=$5 WHERE id=$1',
            [
              row.id,
              cpf === null ? null : cipher.encrypt(cpf),
              phone === null ? null : cipher.encrypt(phone),
              this.hash(cipher, 'cpf', cpf),
              this.hash(cipher, 'phone', phone),
            ],
          );
        else
          await runner.query('UPDATE users SET cpf=$2,phone=$3 WHERE id=$1', [row.id, cpf, phone]);
        cursor = row.id;
      }
    }
  }

  private hash(cipher: FieldEncryption, field: string, value: string | null): string | null {
    const digits = value?.replace(/\D/g, '') ?? '';
    return digits ? cipher.blindIndex(`${field}:${digits}`) : null;
  }
}
