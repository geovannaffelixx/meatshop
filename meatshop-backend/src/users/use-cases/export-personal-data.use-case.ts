import { fieldEncryption } from '../../common/security/field-encryption';
import { Injectable, PayloadTooLargeException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MAX_REPORT_SOURCE_BYTES } from '../../exports/report-size';

const sources: Record<string, string> = {
  profile: 'SELECT to_jsonb(u) AS data FROM users u WHERE id=$1',
  addresses: 'SELECT to_jsonb(a) AS data FROM addresses a WHERE user_id=$1',
  orders: 'SELECT to_jsonb(o) AS data FROM orders o WHERE client_id=$1',
  order_items:
    'SELECT to_jsonb(i) AS data FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.client_id=$1',
  payments:
    'SELECT to_jsonb(p) AS data FROM payments p JOIN orders o ON o.id=p.order_id WHERE o.client_id=$1',
  payment_transactions:
    'SELECT to_jsonb(t) AS data FROM payment_transactions t JOIN payments p ON p.transaction_id=t.id JOIN orders o ON o.id=p.order_id WHERE o.client_id=$1',
  payment_refunds:
    'SELECT to_jsonb(r) AS data FROM payment_refunds r JOIN orders o ON o.id=r.order_id WHERE o.client_id=$1',
  payment_refund_attempts:
    'SELECT to_jsonb(a) AS data FROM payment_refund_attempts a JOIN payment_refunds r ON r.id=a.refund_id JOIN orders o ON o.id=r.order_id WHERE o.client_id=$1',
  order_status_history:
    'SELECT to_jsonb(h) AS data FROM order_status_history h JOIN orders o ON o.id=h.order_id WHERE o.client_id=$1 OR h.updated_by=$1',
  coupon_redemptions: 'SELECT to_jsonb(r) AS data FROM coupon_redemptions r WHERE user_id=$1',
  cart: 'SELECT to_jsonb(i) AS data FROM cart_items i JOIN cart c ON c.id=i.cart_id WHERE c.user_id=$1',
  reviews: 'SELECT to_jsonb(r) AS data FROM reviews r WHERE client_id=$1',
  support: 'SELECT to_jsonb(t) AS data FROM support_tickets t WHERE user_id=$1',
  support_messages:
    'SELECT to_jsonb(m) AS data FROM support_messages m JOIN support_tickets t ON t.id=m.ticket_id WHERE t.user_id=$1',
  chat_messages:
    'SELECT to_jsonb(m) AS data FROM chat_messages m WHERE sender_id=$1 OR receiver_id=$1',
  notifications: 'SELECT to_jsonb(n) AS data FROM notifications n WHERE user_id=$1',
  notification_preferences:
    'SELECT to_jsonb(n) AS data FROM notification_preferences n WHERE user_id=$1',
  legal_acceptances: 'SELECT to_jsonb(a) AS data FROM legal_acceptances a WHERE user_id=$1',
  delivery_profile: 'SELECT to_jsonb(d) AS data FROM delivery_persons d WHERE user_id=$1',
  delivery_assignments:
    'SELECT to_jsonb(a) AS data FROM (SELECT o.id AS order_id,o.unit_id,o.delivery_status,o.delivery_step,o.delivery_type,o.is_scheduled,o.scheduled_delivery_date,o.pickup_verified_at,o.delivery_verified_at,o.updated_at FROM orders o JOIN delivery_persons d ON d.id=o.delivery_person_id WHERE d.user_id=$1) a',
  delivery_tracking:
    'SELECT to_jsonb(t) AS data FROM delivery_tracking t JOIN delivery_persons d ON d.id=t.delivery_person_id WHERE d.user_id=$1',
  delivery_offer_rejections:
    'SELECT to_jsonb(r) AS data FROM delivery_offer_rejections r JOIN delivery_persons d ON d.id=r.delivery_person_id WHERE d.user_id=$1',
  delivery_expenses: 'SELECT to_jsonb(e) AS data FROM delivery_expenses e WHERE user_id=$1',
  vehicles:
    'SELECT to_jsonb(v) AS data FROM vehicles v JOIN delivery_persons d ON d.id=v.delivery_person_id WHERE d.user_id=$1',
  unit_memberships: 'SELECT to_jsonb(m) AS data FROM user_units m WHERE user_id=$1',
  delivery_goals:
    'SELECT to_jsonb(g) AS data FROM delivery_goals g JOIN delivery_persons d ON d.id=g.delivery_person_id WHERE d.user_id=$1',
  delivery_reviews:
    'SELECT to_jsonb(r) AS data FROM delivery_reviews r JOIN delivery_persons d ON d.id=r.delivery_person_id WHERE d.user_id=$1',
  delivery_receipts:
    'SELECT to_jsonb(s) AS data FROM delivery_settlements s JOIN delivery_persons d ON d.id=s.delivery_person_id WHERE d.user_id=$1',
  ai_conversations: 'SELECT to_jsonb(c) AS data FROM ai_conversations c WHERE user_id=$1',
  ai_messages:
    'SELECT to_jsonb(m) AS data FROM ai_messages m JOIN ai_conversations c ON c.id=m.conversation_id WHERE c.user_id=$1',
  audit_events:
    "SELECT to_jsonb(a)-'old_data'-'new_data' AS data FROM audit_logs a WHERE user_id=$1",
};

export function removeExportSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeExportSecrets);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !/password|token|secret|ciphertext|session_id|mp_card_id|mp_customer_id|mp_checkout_url|_hash$/i.test(
            key,
          ),
      )
      .map(([key, nested]) => [
        key,
        ['cpf', 'phone', 'contact'].includes(key) && typeof nested === 'string'
          ? fieldEncryption().decrypt(nested)
          : removeExportSecrets(nested),
      ]),
  );
}

@Injectable()
export class ExportPersonalDataUseCase {
  constructor(private readonly db: DataSource) {}

  async execute(userId: number) {
    return this.db.transaction('REPEATABLE READ', async (manager) => {
      const data: Record<string, unknown> = {};
      let sourceBytes = 0;
      for (const [name, sql] of Object.entries(sources)) {
        const [stats]: { byte_count?: string | number }[] = await manager.query(
          `SELECT COALESCE(SUM(pg_column_size(personal_source.data)),0) AS byte_count FROM (${sql}) personal_source`,
          [userId],
        );
        sourceBytes += Number(stats?.byte_count ?? 0);
        if (sourceBytes > MAX_REPORT_SOURCE_BYTES)
          throw new PayloadTooLargeException({
            code: 'EXPORT_TOO_LARGE',
            message:
              'Seus dados ultrapassam o limite seguro de 8 MB. Entre em contato com o suporte.',
          });
        const rows = await manager.query(sql, [userId]);
        data[name] = removeExportSecrets(rows.map((row: { data: unknown }) => row.data));
      }
      return { version: 1, exported_at: new Date().toISOString(), data };
    });
  }
}
