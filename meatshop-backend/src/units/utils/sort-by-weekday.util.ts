import type { BusinessHours } from '../entities/business-hours.entity';
import { WEEKDAY_ORDER } from '../enums/weekday.enum';

export function sortByWeekday(entries: BusinessHours[]): BusinessHours[] {
  return [...entries].sort(
    (a, b) => WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday),
  );
}
