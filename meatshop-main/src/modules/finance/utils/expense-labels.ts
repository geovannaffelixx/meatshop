const expenseTypes: Record<string, string> = {
  Purchases: "Compras", Services: "Serviços", Other: "Outros",
};
const paymentMethods: Record<string, string> = {
  Pix: "Pix", Credit: "Crédito", Debit: "Débito", Cash: "Dinheiro", "Bank Slip": "Boleto",
};

export const expenseTypeLabel = (value: string) => expenseTypes[value] ?? value;
export const expensePaymentLabel = (value: string) => paymentMethods[value] ?? value;
