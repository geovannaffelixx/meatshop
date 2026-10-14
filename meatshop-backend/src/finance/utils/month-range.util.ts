import { BadRequestException } from '@nestjs/common';

export type MonthRange = {
  start: Date;
  end: Date;
  year: number;
  month: number;
  daysInMonth: number;
};

export function normalizeMonthRange(month?: string): MonthRange {
  if (!month) {
    throw new BadRequestException('Query param "month" (YYYY-MM) is required.');
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new BadRequestException('Invalid "month" format. Use YYYY-MM.');
  }

  const [year, monthNumber] = month.split('-').map(Number);
  if (monthNumber < 1 || monthNumber > 12 || year < 2000 || year > 2100)
    throw new BadRequestException('Invalid month');
  const start = businessMidnight(new Date(Date.UTC(year, monthNumber - 1, 1)));
  const end = businessMidnight(new Date(Date.UTC(year, monthNumber, 1)));
  const daysInMonth = new Date(year, monthNumber, 0).getDate();

  return { start, end, year, month: monthNumber, daysInMonth };
}

export function businessMidnight(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const offset =
    Date.UTC(
      value('year'),
      value('month') - 1,
      value('day'),
      value('hour'),
      value('minute'),
      value('second'),
    ) - date.getTime();
  return new Date(date.getTime() - offset);
}

export function businessDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
