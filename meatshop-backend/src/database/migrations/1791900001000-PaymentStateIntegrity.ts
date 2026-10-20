import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentStateIntegrity1791900001000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    const [{ count }] = await q.query(
      'SELECT COUNT(*)::integer AS count FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.payment_status::text<>p.status::text',
    );
    if (count)
      throw new Error(
        'Reconcile divergent order/payment states before applying PaymentStateIntegrity',
      );
    await q.query(`CREATE FUNCTION assert_order_payment_consistency() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE order_status text; payment_status text; target integer;
      BEGIN
        IF TG_TABLE_NAME='payments' THEN target:=NEW.order_id; ELSE target:=NEW.id; END IF;
        SELECT o.payment_status::text,p.status::text INTO order_status,payment_status
          FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.id=target;
        IF order_status IS DISTINCT FROM payment_status THEN
          RAISE EXCEPTION 'Order/payment states diverge for order %',target USING ERRCODE='23514';
        END IF;
        RETURN NULL;
      END $$`);
    await q.query(
      `CREATE CONSTRAINT TRIGGER orders_payment_consistent AFTER INSERT OR UPDATE ON orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_order_payment_consistency()`,
    );
    await q.query(
      `CREATE CONSTRAINT TRIGGER payments_order_consistent AFTER INSERT OR UPDATE ON payments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_order_payment_consistency()`,
    );
    await q.query(
      `CREATE UNIQUE INDEX payment_refund_attempt_identity ON payment_refunds(attempt_key)`,
    );
    await q.query(
      `ALTER TABLE payment_refunds ADD CONSTRAINT payment_refund_state_valid CHECK(status IN ('PENDING','FAILED','COMPLETED'))`,
    );
    await q.query(
      `ALTER TABLE payment_manual_events ADD CONSTRAINT payment_manual_reference_valid CHECK(length(btrim(reference))>=3)`,
    );
    await q.query(
      `ALTER TABLE delivery_settlements ADD CONSTRAINT delivery_settlement_reference_valid CHECK(length(btrim(reference))>=3)`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TRIGGER orders_payment_consistent ON orders`);
    await q.query(`DROP TRIGGER payments_order_consistent ON payments`);
    await q.query(`DROP FUNCTION assert_order_payment_consistency()`);
    await q.query(`DROP INDEX payment_refund_attempt_identity`);
    await q.query(`ALTER TABLE payment_refunds DROP CONSTRAINT payment_refund_state_valid`);
    await q.query(
      `ALTER TABLE payment_manual_events DROP CONSTRAINT payment_manual_reference_valid`,
    );
    await q.query(
      `ALTER TABLE delivery_settlements DROP CONSTRAINT delivery_settlement_reference_valid`,
    );
  }
}
