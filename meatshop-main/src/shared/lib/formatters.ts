import { BUSINESS_TIME_ZONE, formatDateValue } from './date-time';

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  dateStyle: "short",
});

export const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});

export function formatCurrency(value: number | string | null | undefined) {
  return currencyFormatter.format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined) {
  return formatDateValue(value);
}

export function formatDateTime(value: string | null | undefined) {
  return formatDateValue(value, { dateStyle: 'short', timeStyle: 'short' });
}
