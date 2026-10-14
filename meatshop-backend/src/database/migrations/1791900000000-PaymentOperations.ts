import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentOperations1791900000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    const [{ count }] = await q.query(
      'SELECT COUNT(*)::integer AS count FROM payments WHERE payment_date IS NOT NULL',
    );
    if (count && process.env.NODE_ENV === 'production' && !process.env.PAYMENTS_LEGACY_TIMEZONE)
      throw new Error(
        'Set PAYMENTS_LEGACY_TIMEZONE to the verified timezone of historical payment_date values before migrating',
      );
    const zone = process.env.PAYMENTS_LEGACY_TIMEZONE ?? 'America/Sao_Paulo';
    if (!(await q.query('SELECT name FROM pg_timezone_names WHERE name=$1', [zone])).length)
      throw new Error('Invalid PAYMENTS_LEGACY_TIMEZONE');
    await q.query(
      `ALTER TABLE payments ALTER COLUMN payment_date TYPE timestamptz USING payment_date AT TIME ZONE '${zone.replace(/'/g, "''")}'`,
    );
    await q.query(`ALTER TABLE orders ADD COLUMN checkout_request_hash varchar(64)`);
    await q.query(`ALTER TABLE payments ADD COLUMN payment_reference varchar(100)`);
    // Recover references of preferences created through the older UUID endpoint.
    await q.query(`UPDATE payments p SET payment_reference=COALESCE(
      (SELECT t.reference FROM payment_transactions t WHERE t.id=p.transaction_id), CASE WHEN p.mp_preference_id IS NULL THEN o.id::text END)
      FROM orders o WHERE o.id=p.order_id`);
    await q.query(`ALTER TABLE payment_refunds ADD COLUMN attempt_key uuid,
      ADD COLUMN retry_requested_by integer REFERENCES users(id)`);
    await q.query(`UPDATE payment_refunds SET attempt_key=id`);
    await q.query(`ALTER TABLE payment_refunds ALTER COLUMN attempt_key SET NOT NULL`);
    await q.query(`CREATE TABLE payment_refund_attempts (
      id bigserial PRIMARY KEY, refund_id uuid NOT NULL REFERENCES payment_refunds(id),
      attempt_key uuid NOT NULL, provider_id varchar(80), status varchar(30) NOT NULL,
      actor_id integer REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`ALTER TABLE payment_sellers ADD COLUMN last_error varchar(255),
      ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()`);
    await q.query(`CREATE TABLE payment_seller_events (
      id bigserial PRIMARY KEY, unit_id integer NOT NULL REFERENCES units(id),
      actor_id integer REFERENCES users(id), kind varchar(30) NOT NULL,
      collector_id varchar(80), created_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX payment_reconcile_due ON payments(reconcile_after,order_id)`);
    await q.query(
      `CREATE INDEX payment_notification_due ON payment_notifications(next_attempt_at,id) WHERE sent_at IS NULL`,
    );
    await q.query(
      `CREATE INDEX payment_manual_order ON payment_manual_events(order_id,created_at)`,
    );
    await q.query(`CREATE INDEX payment_refunds_order ON payment_refunds(order_id,created_at)`);
    await q.query(
      `CREATE INDEX payment_seller_events_unit ON payment_seller_events(unit_id,created_at)`,
    );
    await q.query(
      `CREATE INDEX payment_transactions_unit_reference ON payment_transactions(unit_id,reference)`,
    );
    await q.query(
      `ALTER TABLE payments ADD CONSTRAINT payment_amounts_nonnegative CHECK(refunded_amount>=0 AND fee_amount>=0) NOT VALID`,
    );
    await q.query(
      `ALTER TABLE payment_transactions ADD CONSTRAINT transaction_amounts_valid CHECK(amount>0 AND refunded_amount>=0 AND refunded_amount<=amount) NOT VALID`,
    );
    await q.query(
      `ALTER TABLE payment_manual_events ADD CONSTRAINT manual_amount_positive CHECK(amount>0) NOT VALID`,
    );
    await q.query(
      `ALTER TABLE delivery_settlements ADD CONSTRAINT settlement_amount_positive CHECK(amount>0) NOT VALID`,
    );
    for (const [table, constraint] of [
      ['payments', 'payment_amounts_nonnegative'],
      ['payment_transactions', 'transaction_amounts_valid'],
      ['payment_manual_events', 'manual_amount_positive'],
      ['delivery_settlements', 'settlement_amount_positive'],
    ])
      await q.query(`ALTER TABLE ${table} VALIDATE CONSTRAINT ${constraint}`);
  }

  async down(q: QueryRunner): Promise<void> {
    const zone = process.env.PAYMENTS_LEGACY_TIMEZONE ?? 'America/Sao_Paulo';
    if (!(await q.query('SELECT name FROM pg_timezone_names WHERE name=$1', [zone])).length)
      throw new Error('Invalid PAYMENTS_LEGACY_TIMEZONE');
    await q.query(
      `ALTER TABLE payments ALTER COLUMN payment_date TYPE timestamp USING payment_date AT TIME ZONE '${zone.replace(/'/g, "''")}'`,
    );
    await q.query(`ALTER TABLE orders DROP COLUMN checkout_request_hash`);
    await q.query(
      `ALTER TABLE payments DROP CONSTRAINT payment_amounts_nonnegative, DROP COLUMN payment_reference`,
    );
    await q.query(`ALTER TABLE payment_transactions DROP CONSTRAINT transaction_amounts_valid`);
    await q.query(`ALTER TABLE payment_manual_events DROP CONSTRAINT manual_amount_positive`);
    await q.query(`ALTER TABLE delivery_settlements DROP CONSTRAINT settlement_amount_positive`);
    await q.query(`DROP TABLE payment_refund_attempts, payment_seller_events`);
    await q.query(
      `ALTER TABLE payment_refunds DROP COLUMN attempt_key, DROP COLUMN retry_requested_by`,
    );
    await q.query(`ALTER TABLE payment_sellers DROP COLUMN last_error, DROP COLUMN updated_at`);
    for (const index of [
      'payment_reconcile_due',
      'payment_notification_due',
      'payment_manual_order',
      'payment_refunds_order',
      'payment_transactions_unit_reference',
    ])
      await q.query(`DROP INDEX ${index}`);
  }
}
