export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';
export type DateValue = string | number | Date | null | undefined;

export function isValidDate(value: string) {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!iso && !br) return false;
  const [year, month, day] = iso ? iso.slice(1).map(Number) : [Number(br![3]), Number(br![2]), Number(br![1])];
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return year >= 1900 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseDateValue(value: DateValue) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) && !isValidDate(value.slice(0, 10))) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatDateValue(value: DateValue, options: Intl.DateTimeFormatOptions = { dateStyle: 'short' }) {
  const date = parseDateValue(value);
  if (!date) return '—';
  const calendarDate = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: calendarDate ? 'UTC' : BUSINESS_TIME_ZONE }).format(date);
}

export function toDateInput(value: DateValue) {
  if (typeof value === 'string' && isValidDate(value) && value.includes('-')) return value;
  const date = parseDateValue(value);
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function toDatetimeLocal(value: DateValue) {
  const date = parseDateValue(value);
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

export function isValidDateTime(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/);
  return Boolean(match && isValidDate(match[1]) && Number(match[2]) < 24 && Number(match[3]) < 60);
}

export function datetimeLocalToISO(value: string) {
  if (!isValidDateTime(value)) throw new Error('Informe data e horário válidos.');
  const desired = new Date(`${value}:00Z`).getTime();
  let instant = desired;
  for (let i = 0; i < 3; i++) {
    const rendered = new Date(`${toDatetimeLocal(instant)}:00Z`).getTime();
    const delta = desired - rendered;
    if (!delta) return new Date(instant).toISOString();
    instant += delta;
  }
  throw new Error('Este horário não existe no fuso da unidade.');
}

export function validateDateRange(start: string, end: string) {
  if (!isValidDateTime(start) || !isValidDateTime(end)) return false;
  try { return datetimeLocalToISO(end) > datetimeLocalToISO(start); } catch { return false; }
}
