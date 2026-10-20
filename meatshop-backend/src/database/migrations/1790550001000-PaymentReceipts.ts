import type { MigrationInterface, QueryRunner } from 'typeorm';
export class PaymentReceipts1790550001000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `CREATE TABLE payment_manual_events (id uuid PRIMARY KEY,order_id integer NOT NULL REFERENCES orders(id),actor_id integer NOT NULL REFERENCES users(id),kind varchar(30) NOT NULL,amount numeric(12,2) NOT NULL,reference varchar(200) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(order_id,kind))`,
    );
    await q.query(
      `CREATE TABLE delivery_settlements (order_id integer PRIMARY KEY REFERENCES orders(id),delivery_person_id integer NOT NULL REFERENCES delivery_persons(id),actor_id integer NOT NULL REFERENCES users(id),amount numeric(12,2) NOT NULL,reference varchar(200) NOT NULL,paid_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE TABLE payment_notifications (id serial PRIMARY KEY,order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,status varchar(30) NOT NULL,sent_at timestamptz,next_attempt_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(order_id,status))`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE payment_notifications');
    await q.query('DROP TABLE delivery_settlements');
    await q.query('DROP TABLE payment_manual_events');
  }
}
