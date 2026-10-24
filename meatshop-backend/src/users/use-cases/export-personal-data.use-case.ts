import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

const sources: Record<string, string> = {
  profile: 'SELECT to_jsonb(u) AS data FROM users u WHERE id=$1',
  addresses: 'SELECT to_jsonb(a) AS data FROM addresses a WHERE user_id=$1',
  orders: 'SELECT to_jsonb(o) AS data FROM orders o WHERE client_id=$1',
  order_items:
    'SELECT to_jsonb(i) AS data FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.client_id=$1',
  payments:
    'SELECT to_jsonb(p) AS data FROM payments p JOIN orders o ON o.id=p.order_id WHERE o.client_id=$1',
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
  saved_payment_methods: 'SELECT to_jsonb(p) AS data FROM saved_payment_methods p WHERE user_id=$1',
  delivery_profile: 'SELECT to_jsonb(d) AS data FROM delivery_persons d WHERE user_id=$1',
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
};

export function removeExportSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeExportSecrets);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !/password|token|secret|ciphertext|session_id|mp_card_id|mp_customer_id|_hash$/i.test(
            key,
          ),
      )
      .map(([key, nested]) => [key, removeExportSecrets(nested)]),
  );
}

@Injectable()
export class ExportPersonalDataUseCase {
  constructor(private readonly db: DataSource) {}

  async execute(userId: number) {
    return this.db.transaction('REPEATABLE READ', async (manager) => {
      const data: Record<string, unknown> = {};
      for (const [name, sql] of Object.entries(sources)) {
        const rows = await manager.query(sql, [userId]);
        data[name] = removeExportSecrets(rows.map((row: { data: unknown }) => row.data));
      }
      return { version: 1, exported_at: new Date().toISOString(), data };
    });
  }
}
