import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentContract1791900002000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    const [{ count }] = await q.query(
      'SELECT COUNT(*)::integer AS count FROM (SELECT transaction_id FROM payments WHERE transaction_id IS NOT NULL GROUP BY transaction_id HAVING COUNT(*)>1) shared',
    );
    if (count)
      throw new Error(
        'Reconcile shared legacy payment transaction IDs before applying PaymentContract',
      );
    await q.query(
      'CREATE UNIQUE INDEX payment_transaction_owner ON payments(transaction_id) WHERE transaction_id IS NOT NULL',
    );
    await q.query(
      "CREATE INDEX payment_receipt_date ON payments(payment_date,order_id) WHERE status IN ('PAID','PARTIALLY_REFUNDED')",
    );
    await q.query('CREATE INDEX payment_order_unit_date ON orders(unit_id,order_date,id)');
    await q.query('CREATE INDEX payment_order_client_date ON orders(client_id,order_date,id)');
    await q.query('ALTER TABLE order_items ADD COLUMN product_snapshot jsonb');
    await q.query(
      `UPDATE order_items i SET product_snapshot=jsonb_build_object('name',p.name,'unit_of_measure',p.unit_of_measure,'image_url',p.image_url) FROM products p WHERE p.id=i.product_id`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE order_items DROP COLUMN product_snapshot');
    await q.query('DROP INDEX payment_transaction_owner');
    await q.query(
      'DROP INDEX payment_receipt_date,payment_order_unit_date,payment_order_client_date',
    );
  }
}
