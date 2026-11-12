export const PAYMENT_VIEWS: Record<string, string> = {
  all: 'true',
  pending: "p.status IN ('PENDING','REJECTED') AND o.status<>'CANCELLED'",
  receivable:
    "p.status='PENDING' AND p.method IN ('Cash','Card on Delivery') AND o.status<>'CANCELLED'",
  refunds:
    "EXISTS(SELECT 1 FROM payment_refunds r WHERE r.unit_id=o.unit_id AND (r.order_id=o.id OR r.payment_id IN (SELECT t.id FROM payment_transactions t WHERE t.unit_id=o.unit_id AND t.reference IN (o.id::text,o.checkout_id::text))) AND r.status IN ('PENDING','FAILED'))",
  issues: "p.status='CHARGED_BACK' OR p.refund_status='FAILED'",
};
