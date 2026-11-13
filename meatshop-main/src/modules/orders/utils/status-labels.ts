export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  READY: "Pronto",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  REJECTED: "Rejeitado",
  REFUNDED: "Reembolsado",
  PARTIALLY_REFUNDED: "Reembolsado parcialmente",
  CHARGED_BACK: "Contestado",
  CANCELLED: "Cancelado",
};

export const DELIVERY_TYPE_LABELS: Record<string, string> = {
  DELIVERY: "Entrega",
  PICKUP: "Retirada no balcão",
};

export function orderStatusLabel(status: string, deliveryType?: string): string {
  if (deliveryType === "PICKUP") {
    if (status === "READY") return "Pronto para retirada";
    if (status === "DELIVERED") return "Retirado";
  }
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function paymentMethodLabel(method: string | null | undefined, deliveryType?: string): string {
  if (method === "Card on Delivery") return deliveryType === "PICKUP" ? "Maquininha no balcão" : "Maquininha na entrega";
  const labels: Record<string, string> = { Cash: "Dinheiro", Pix: "Pix", Credit: "Cartão de crédito", Debit: "Cartão de débito", "Credit Card": "Cartão de crédito", "Debit Card": "Cartão de débito" };
  return method ? labels[method] ?? method : "Não informado";
}

export function canCompletePickup(paymentStatus: string): boolean {
  return ["PAID", "PARTIALLY_REFUNDED"].includes(paymentStatus);
}
