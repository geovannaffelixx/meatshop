import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DeliveryEarningsEvents1793300002000 implements MigrationInterface {
  name = 'DeliveryEarningsEvents1793300002000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE delivery_earnings_events (
      id bigserial PRIMARY KEY, order_id integer NOT NULL, user_id integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now())`);
    await runner.query(`CREATE FUNCTION queue_delivery_earnings_event() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE target_order integer; BEGIN
      IF TG_TABLE_NAME = 'orders' THEN
        IF NEW.delivery_person_id IS NULL OR
          (NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.delivery_fee IS NOT DISTINCT FROM OLD.delivery_fee)
          THEN RETURN NEW; END IF;
        target_order := NEW.id;
      ELSE
        target_order := CASE WHEN TG_OP='DELETE' THEN OLD.order_id ELSE NEW.order_id END;
      END IF;
      INSERT INTO delivery_earnings_events(order_id,user_id)
        SELECT o.id,p.user_id FROM orders o JOIN delivery_persons p ON p.id=o.delivery_person_id
        WHERE o.id=target_order;
      RETURN NULL;
    END $$`);
    await runner.query(`CREATE TRIGGER queue_delivery_earnings_order AFTER UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION queue_delivery_earnings_event()`);
    await runner.query(`CREATE TRIGGER queue_delivery_earnings_settlement AFTER INSERT OR UPDATE OR DELETE
      ON delivery_settlements FOR EACH ROW EXECUTE FUNCTION queue_delivery_earnings_event()`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TRIGGER queue_delivery_earnings_order ON orders');
    await runner.query('DROP TRIGGER queue_delivery_earnings_settlement ON delivery_settlements');
    await runner.query('DROP FUNCTION queue_delivery_earnings_event()');
    await runner.query('DROP TABLE delivery_earnings_events');
  }
}
