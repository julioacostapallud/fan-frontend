import { getDay, parseISO, subDays, format } from 'date-fns';
import { BUSINESS_DAY_MINUTES } from '../../shared/constants';
import { elapsedBusinessMinutes, todayBusinessDayIso } from './businessDay';
import type { AnalyticsSale, ComparisonMode } from './types';

function weekdayIndex(isoDay: string): number {
  return getDay(parseISO(isoDay));
}

export function listBusinessDays(sales: AnalyticsSale[]): string[] {
  return [...new Set(sales.map((s) => s.businessDay))].sort();
}

export function resolveComparableDays(
  sales: AnalyticsSale[],
  day: string,
  mode: ComparisonMode,
  customDay: string | null,
): string[] {
  const all = listBusinessDays(sales).filter((d) => d !== day);
  switch (mode) {
    case 'none':
      return [];
    case 'previousDay': {
      const prev = format(subDays(parseISO(day), 1), 'yyyy-MM-dd');
      if (all.includes(prev)) return [prev];
      return all.filter((d) => d < day).slice(-1);
    }
    case 'sameWeekdayPrev': {
      const wd = weekdayIndex(day);
      return all.filter((d) => d < day && weekdayIndex(d) === wd).slice(-1);
    }
    case 'avgLast4Equivalent': {
      const wd = weekdayIndex(day);
      return all.filter((d) => d < day && weekdayIndex(d) === wd).slice(-4);
    }
    case 'avgLast8Equivalent': {
      const wd = weekdayIndex(day);
      return all.filter((d) => d < day && weekdayIndex(d) === wd).slice(-8);
    }
    case 'customDay':
      return customDay && customDay !== day ? [customDay] : [];
    default:
      return [];
  }
}

export function comparisonUntilMinute(
  primaryDay: string,
  compareFullHistorical: boolean,
  now = new Date(),
): number {
  if (compareFullHistorical) return BUSINESS_DAY_MINUTES;
  if (primaryDay === todayBusinessDayIso(now)) {
    return elapsedBusinessMinutes(primaryDay, now);
  }
  return BUSINESS_DAY_MINUTES;
}

export { weekdayIndex };
