import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { readPositiveInteger } from '../../config/runtime-config';

@Injectable()
export class PersonalDataRetentionService {
  private readonly days: number;
  constructor(
    private readonly db: DataSource,
    config: ConfigService,
  ) {
    this.days = readPositiveInteger(
      { AUTH_ATTEMPTS_RETENTION_DAYS: config.get<string>('AUTH_ATTEMPTS_RETENTION_DAYS') },
      'AUTH_ATTEMPTS_RETENTION_DAYS',
      30,
    );
  }

  policy() {
    return {
      auth_attempts_days: this.days,
      expired_sessions: 'removed_daily',
      orders_payments_audit: 'preserved_for_operational_and_legal_requirements',
      account_deletion: 'identity_and_addresses_anonymized',
      ai_and_tracking: 'separate_configurable_policies',
      support: 'preserved_pending_documented_retention_review',
      delivery_expenses: 'amounts_preserved_description_anonymized_on_account_deletion',
    };
  }

  @Cron('0 15 3 * * *', { waitForCompletion: true })
  async run(): Promise<void> {
    await this.db.transaction(async (manager) => {
      const [lock] = await manager.query(
        "SELECT pg_try_advisory_xact_lock(hashtext('personal-data-retention')) AS acquired",
      );
      if (!lock.acquired) return;
      await manager.query(
        "DELETE FROM auth_login_attempts WHERE updated_at < now()-($1::int * interval '1 day') AND (locked_until IS NULL OR locked_until<now())",
        [this.days],
      );
      await manager.query('DELETE FROM refresh_tokens WHERE expires_at<now()');
      await manager.query(
        'UPDATE users SET password_reset_token=NULL,password_reset_expires_at=NULL WHERE password_reset_expires_at<now() AND password_reset_token IS NOT NULL',
      );
    });
  }
}
