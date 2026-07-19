import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format, startOfDay, subDays } from 'date-fns';
import { BUSINESS_DAY_START_HOUR, BUSINESS_TZ } from './constants';

export function formatSaleDate(iso: string): string {
  return formatInTimeZone(new Date(iso), BUSINESS_TZ, 'dd/MM/yyyy');
}

export function formatSaleTime(iso: string): string {
  return formatInTimeZone(new Date(iso), BUSINESS_TZ, 'HH:mm');
}

export function formatSaleDateTime(iso: string): string {
  return formatInTimeZone(new Date(iso), BUSINESS_TZ, "dd/MM/yyyy '·' HH:mm");
}

/**
 * Día operativo de un instante (yyyy-MM-dd).
 * Antes de las 06:00 AR cuenta para el día calendario anterior.
 */
export function toBusinessDayIso(date: Date = new Date()): string {
  const zoned = toZonedTime(date, BUSINESS_TZ);
  let day = startOfDay(zoned);
  if (zoned.getHours() < BUSINESS_DAY_START_HOUR) {
    day = subDays(day, 1);
  }
  return format(day, 'yyyy-MM-dd');
}

/** Día operativo actual (06:00→06:00 AR). */
export function todayIsoDate(now: Date = new Date()): string {
  return toBusinessDayIso(now);
}

/** yyyy-MM-dd → dd/MM/yyyy */
export function formatIsoDayLabel(isoDay: string): string {
  const [y, m, d] = isoDay.split('-');
  if (!y || !m || !d) return isoDay;
  return `${d}/${m}/${y}`;
}
