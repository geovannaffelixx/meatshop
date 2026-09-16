export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

export const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatCurrency(value: number | string | null | undefined) {
  return currencyFormatter.format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined) {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

export function formatDateTime(value: string | null | undefined) {
  return value ? dateTimeFormatter.format(new Date(value)) : "—";
}
