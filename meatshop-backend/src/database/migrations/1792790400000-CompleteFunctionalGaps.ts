import type { MigrationInterface, QueryRunner } from 'typeorm';

const auditedTables = [
  'users',
  'units',
  'user_units',
  'products',
  'stock',
  'categories',
  'orders',
  'order_items',
  'payments',
  'payment_transactions',
  'payment_refunds',
  'payment_manual_events',
  'delivery_settlements',
  'payment_refund_attempts',
  'payment_seller_events',
  'promotions',
  'coupons',
  'support_tickets',
  'support_messages',
  'expenses',
  'delivery_expenses',
  'notification_preferences',
  'business_hours',
  'user_device_tokens',
  'saved_payment_methods',
  'delivery_persons',
  'vehicles',
  'legal_acceptances',
];

export class CompleteFunctionalGaps1792790400000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      'CREATE TABLE socket_io_attachments(id bigserial UNIQUE,created_at timestamptz DEFAULT now(),payload bytea)',
    );
    await q.query(
      'CREATE INDEX IDX_socket_io_attachments_created ON socket_io_attachments(created_at)',
    );
    await q.query(
      `CREATE TABLE auth_login_attempts(identity_hash varchar(64) PRIMARY KEY, failed_attempts integer NOT NULL DEFAULT 0 CHECK(failed_attempts BETWEEN 0 AND 4), locked_until timestamptz, updated_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE TABLE delivery_expenses(id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id), category varchar(30) NOT NULL CHECK(category IN ('FUEL','MAINTENANCE','PARKING','TOLL','INSURANCE','OTHER')), description varchar(300) NOT NULL CHECK(length(trim(description))>0), amount numeric(12,2) NOT NULL CHECK(amount>0 AND amount<=9999999999.99), incurred_on date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE INDEX IDX_delivery_expenses_user_date ON delivery_expenses(user_id,incurred_on DESC,id DESC)`,
    );
    await q.query(
      'CREATE INDEX IDX_auth_login_attempts_updated ON auth_login_attempts(updated_at)',
    );
    await this.ensureAuditCoverage(q);
  }

  async ensureAuditCoverage(q: QueryRunner): Promise<void> {
    await q.query(`CREATE OR REPLACE FUNCTION audit_business_change() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE previous jsonb; current_value jsonb; safe_previous jsonb; safe_current jsonb;
      BEGIN
        IF TG_OP <> 'INSERT' THEN previous=to_jsonb(OLD); END IF;
        IF TG_OP <> 'DELETE' THEN current_value=to_jsonb(NEW); END IF;
        SELECT jsonb_object_agg(key,value) INTO safe_previous FROM jsonb_each(previous)
          WHERE key=ANY(ARRAY['id','user_id','unit_id','order_id','product_id','client_id','status','payment_status','price','unit_price','quantity','total_amount','amount', 'fee_amount', 'discount_amount', 'refund_status', 'local_role', 'weekday', 'opening_time', 'closing_time', 'scheduling_slot_minutes', 'scheduling_capacity','refunded_amount','active','is_active','is_online','category_id','method']);
        SELECT jsonb_object_agg(key,value) INTO safe_current FROM jsonb_each(current_value)
          WHERE key=ANY(ARRAY['id','user_id','unit_id','order_id','product_id','client_id','status','payment_status','price','unit_price','quantity','total_amount','amount', 'fee_amount', 'discount_amount', 'refund_status', 'local_role', 'weekday', 'opening_time', 'closing_time', 'scheduling_slot_minutes', 'scheduling_capacity','refunded_amount','active','is_active','is_online','category_id','method']);
        INSERT INTO audit_logs(action,entity,entity_id,description,user_id,actor_type,correlation_id,old_data,new_data)
          VALUES(TG_OP,TG_TABLE_NAME,COALESCE(current_value->>'id',previous->>'id'),'Transactional database change',NULLIF(current_setting('meatshop.actor_id',true),'')::integer,CASE WHEN NULLIF(current_setting('meatshop.actor_id',true),'') IS NULL THEN 'SYSTEM' ELSE 'USER' END,COALESCE(NULLIF(current_setting('meatshop.request_id',true),''),txid_current()::text),safe_previous::text,safe_current::text);
        RETURN COALESCE(NEW,OLD);
      END;
    $$`);
    for (const table of auditedTables) {
      if (
        (await q.hasTable(table)) &&
        !(
          await q.query(
            "SELECT 1 FROM pg_trigger WHERE tgrelid=$1::regclass AND tgname='trg_transactional_audit'",
            [table],
          )
        ).length
      )
        await q.query(
          `CREATE TRIGGER TRG_transactional_audit AFTER INSERT OR UPDATE OR DELETE ON "${table}" FOR EACH ROW EXECUTE FUNCTION audit_business_change()`,
        );
    }
    if (
      !(
        await q.query(
          "SELECT 1 FROM pg_trigger WHERE tgrelid='audit_logs'::regclass AND tgname='trg_audit_logs_no_truncate'",
        )
      ).length
    )
      await q.query(
        `CREATE TRIGGER TRG_audit_logs_no_truncate BEFORE TRUNCATE ON audit_logs FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_log_mutation()`,
      );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TRIGGER TRG_audit_logs_no_truncate ON audit_logs');
    for (const table of auditedTables) {
      if (await q.hasTable(table))
        await q.query(`DROP TRIGGER IF EXISTS TRG_transactional_audit ON "${table}"`);
    }
    await q.query('DROP FUNCTION audit_business_change()');
    await q.query('DROP TABLE delivery_expenses');
    await q.query('DROP TABLE auth_login_attempts');
    await q.query('DROP TABLE socket_io_attachments');
  }
}
