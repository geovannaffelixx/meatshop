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
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const daysInMonth = new Date(year, monthNumber, 0).getDate();

  return { start, end, year, month: monthNumber, daysInMonth };
}
