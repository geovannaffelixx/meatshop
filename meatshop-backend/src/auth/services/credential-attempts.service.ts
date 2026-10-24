import { HttpException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';

export class CredentialAttemptsService {
  constructor(private readonly db: DataSource) {}

  async authenticate<T>(
    email: string,
    verify: (manager: EntityManager) => Promise<T | null>,
  ): Promise<T | null> {
    const normalized = email.trim().toLowerCase();
    const identity = createHash('sha256').update(normalized).digest('hex');
    const result = await this.db.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`login:${identity}`]);
      await manager.query(
        'INSERT INTO auth_login_attempts(identity_hash) VALUES ($1) ON CONFLICT DO NOTHING',
        [identity],
      );
      const [attempt] = await manager.query(
        'SELECT * FROM auth_login_attempts WHERE identity_hash=$1 FOR UPDATE',
        [identity],
      );
      const [user] = await manager.query(
        'SELECT locked_until,is_active FROM users WHERE email=$1',
        [normalized],
      );
      if (
        (attempt.locked_until && new Date(attempt.locked_until) > new Date()) ||
        (user?.locked_until && new Date(user.locked_until) > new Date())
      )
        return { locked: true, value: null };
      if (user && !user.is_active) throw new UnauthorizedException('Invalid credentials');
      const value = await verify(manager);
      if (value !== null) {
        await manager.query('DELETE FROM auth_login_attempts WHERE identity_hash=$1', [identity]);
        await manager.query(
          'UPDATE users SET failed_login_attempts=0,locked_until=NULL WHERE email=$1 AND (failed_login_attempts<>0 OR locked_until IS NOT NULL)',
          [normalized],
        );
        return { locked: false, value };
      }
      const count = attempt.locked_until ? 1 : Number(attempt.failed_attempts) + 1;
      const locked = count >= 5;
      await manager.query(
        "UPDATE auth_login_attempts SET failed_attempts=$2,locked_until=CASE WHEN $3 THEN now()+interval '15 minutes' ELSE NULL END,updated_at=now() WHERE identity_hash=$1",
        [identity, locked ? 0 : count, locked],
      );
      await manager.query(
        "UPDATE users SET locked_until=CASE WHEN $3 THEN now()+interval '15 minutes' ELSE NULL END,failed_login_attempts=$2 WHERE email=$1",
        [normalized, locked ? 0 : count, locked],
      );
      return { locked, value: null };
    });
    if (result.locked)
      throw new HttpException(
        { code: 'ACCOUNT_LOCKED', message: 'Muitas tentativas. Tente novamente em 15 minutos.' },
        429,
      );
    return result.value;
  }
}
