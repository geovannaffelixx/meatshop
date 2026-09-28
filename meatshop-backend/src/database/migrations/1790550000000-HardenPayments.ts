import type { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenPayments1790550000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TYPE payments_method_enum ADD VALUE IF NOT EXISTS 'Card on Delivery'`);
    for (const type of ['payments_status_enum', 'orders_payment_status_enum']) {
      await q.query(`ALTER TYPE ${type} ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED'`);
      await q.query(`ALTER TYPE ${type} ADD VALUE IF NOT EXISTS 'CHARGED_BACK'`);
    }
    await q.query(
      `ALTER TABLE orders ADD COLUMN payment_due_at timestamptz, ADD COLUMN change_for numeric(12,2)`,
    );
    await q.query(`ALTER TABLE payments ADD COLUMN refunded_amount numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN fee_amount numeric(12,2) NOT NULL DEFAULT 0, ADD COLUMN refund_status varchar(30),
      ADD COLUMN reconcile_after timestamptz NOT NULL DEFAULT now(), ADD COLUMN received_by integer, ADD COLUMN receipt_reference varchar(200)`);
    await q.query(`CREATE TABLE payment_sellers (unit_id integer PRIMARY KEY REFERENCES units(id),collector_id varchar(80) NOT NULL,
      access_token text NOT NULL,refresh_token text NOT NULL,expires_at timestamptz NOT NULL,enabled boolean NOT NULL DEFAULT true)`);
    await q.query(
      `CREATE TABLE payment_oauth_states (state_hash varchar(64) PRIMARY KEY, unit_id integer NOT NULL REFERENCES units(id),user_id integer NOT NULL REFERENCES users(id),verifier text NOT NULL,expires_at timestamptz NOT NULL)`,
    );
    await q.query(`CREATE TABLE payment_transactions (
      id varchar(80) PRIMARY KEY, unit_id integer NOT NULL REFERENCES units(id), reference varchar(100) NOT NULL, status varchar(30) NOT NULL,
      amount numeric(12,2) NOT NULL, refunded_amount numeric(12,2) NOT NULL DEFAULT 0,
      provider_updated_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX ON payment_transactions(reference)`);
    await q.query(`CREATE TABLE payment_refunds (
      id uuid PRIMARY KEY, payment_id varchar(80) NOT NULL, unit_id integer NOT NULL REFERENCES units(id), order_id integer REFERENCES orders(id),
      amount numeric(12,2) NOT NULL CHECK (amount > 0), status varchar(30) NOT NULL DEFAULT 'PENDING',
      reason varchar(255) NOT NULL, requested_by integer, provider_id varchar(80),
      attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
      last_error varchar(255), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(payment_id, order_id))`);
    await q.query(
      `CREATE UNIQUE INDEX payment_duplicate_refund ON payment_refunds(payment_id) WHERE order_id IS NULL`,
    );
    await q.query(
      `CREATE INDEX payment_refund_pending ON payment_refunds(next_attempt_at) WHERE status = 'PENDING'`,
    );
    await q.query(
      `CREATE INDEX payment_order_due ON orders(payment_due_at) WHERE status = 'PENDING'`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE payment_refunds`);
    await q.query(`DROP TABLE payment_transactions`);
    await q.query(`DROP TABLE payment_oauth_states`);
    await q.query(`DROP TABLE payment_sellers`);
    await q.query(`DROP INDEX payment_order_due`);
    await q.query(
      `ALTER TABLE payments DROP COLUMN refunded_amount, DROP COLUMN fee_amount, DROP COLUMN refund_status, DROP COLUMN reconcile_after, DROP COLUMN received_by, DROP COLUMN receipt_reference`,
    );
    await q.query(`ALTER TABLE orders DROP COLUMN payment_due_at, DROP COLUMN change_for`);
  }
}
