import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { accountLocked, LOGIN_ATTEMPT_LIMIT, LOGIN_LOCK_MINUTES } from './account-lock';
type Attempt = { locked_until: string | Date | null; failed_attempts: number };
type Verification<T> = (manager: EntityManager) => Promise<T | null>;

export class CredentialAttemptsService {
  constructor(private readonly db: DataSource) {}

  async authenticate<T>(email: string, verify: Verification<T>): Promise<T | null> {
    const normalized = email.trim().toLowerCase();
    const identity = createHash('sha256').update(normalized).digest('hex');
    const result = await this.db.transaction((manager) =>
      this.verifyAttempt(manager, normalized, identity, verify),
    );
    if (result.lockedUntil) throw accountLocked(result.lockedUntil);
    return result.value;
  }

  private async verifyAttempt<T>(
    manager: EntityManager,
    email: string,
    identity: string,
    verify: Verification<T>,
  ) {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`login:${identity}`]);
    await manager.query(
      'INSERT INTO auth_login_attempts(identity_hash) VALUES ($1) ON CONFLICT DO NOTHING',
      [identity],
    );
    const [attempt]: Attempt[] = await manager.query(
      'SELECT * FROM auth_login_attempts WHERE identity_hash=$1 FOR UPDATE',
      [identity],
    );
    const [user] = await manager.query('SELECT locked_until,is_active FROM users WHERE email=$1', [
      email,
    ]);
    const until = Math.max(
      new Date(attempt.locked_until ?? 0).getTime(),
      new Date(user?.locked_until ?? 0).getTime(),
    );
    if (until > Date.now()) return { lockedUntil: new Date(until), value: null };
    if (user && !user.is_active) throw new UnauthorizedException('Invalid credentials');
    const value = await verify(manager);
    if (value !== null) {
      await this.resetAttempts(manager, email, identity);
      return { lockedUntil: null, value };
    }
    return {
      lockedUntil: await this.recordFailure(manager, email, identity, attempt),
      value: null,
    };
  }

  private async resetAttempts(manager: EntityManager, email: string, identity: string) {
    await manager.query('DELETE FROM auth_login_attempts WHERE identity_hash=$1', [identity]);
    await manager.query(
      'UPDATE users SET failed_login_attempts=0,locked_until=NULL WHERE email=$1 AND (failed_login_attempts<>0 OR locked_until IS NOT NULL)',
      [email],
    );
  }

  private async recordFailure(
    manager: EntityManager,
    email: string,
    identity: string,
    attempt: Attempt,
  ) {
    const count = attempt.locked_until ? 1 : Number(attempt.failed_attempts) + 1;
    const locked = count >= LOGIN_ATTEMPT_LIMIT;
    const lockedUntil = locked ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60_000) : null;
    await manager.query(
      'UPDATE auth_login_attempts SET failed_attempts=$2,locked_until=$3,updated_at=now() WHERE identity_hash=$1',
      [identity, locked ? 0 : count, lockedUntil],
    );
    await manager.query(
      'UPDATE users SET locked_until=$3,failed_login_attempts=$2 WHERE email=$1',
      [email, locked ? 0 : count, lockedUntil],
    );
    return lockedUntil;
  }
}
