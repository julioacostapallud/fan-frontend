import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { addDays, format, parseISO, startOfDay, subDays } from 'date-fns';
import {
  BUSINESS_DAY_MINUTES,
  BUSINESS_DAY_START_HOUR,
  BUSINESS_TZ,
} from '../../shared/constants';

export { BUSINESS_DAY_MINUTES, BUSINESS_DAY_START_HOUR, BUSINESS_TZ };

function wallTimeToUtc(
  isoDay: string,
  hour: number,
  minute = 0,
  second = 0,
  ms = 0,
): Date {
  const [y, m, d] = isoDay.split('-').map(Number);
  const wall = new Date(y, m - 1, d, hour, minute, second, ms);
  return fromZonedTime(wall, BUSINESS_TZ);
}

/** Inicio inclusivo del día comercial (yyyy-MM-dd → 06:00 AR). */
export function businessDayStartUtc(isoDay: string): Date {
  return wallTimeToUtc(isoDay, BUSINESS_DAY_START_HOUR);
}

/** Fin inclusivo del día comercial (un ms antes de las 06:00 del día siguiente). */
export function businessDayEndUtc(isoDay: string): Date {
  const next = format(addDays(parseISO(isoDay), 1), 'yyyy-MM-dd');
  return new Date(businessDayStartUtc(next).getTime() - 1);
}

/**
 * Día comercial de un instante (yyyy-MM-dd).
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

export function todayBusinessDayIso(now: Date = new Date()): string {
  return toBusinessDayIso(now);
}

/** Minutos desde las 06:00 del día comercial (0 … 1439). */
export function minutesIntoBusinessDay(date: Date, businessDayIso: string): number {
  const start = businessDayStartUtc(businessDayIso).getTime();
  const mins = Math.floor((date.getTime() - start) / 60_000);
  return Math.max(0, Math.min(BUSINESS_DAY_MINUTES - 1, mins));
}

/** Minutos transcurridos del día comercial abierto (o 1440 si ya cerró). */
export function elapsedBusinessMinutes(businessDayIso: string, now: Date = new Date()): number {
  const today = todayBusinessDayIso(now);
  if (businessDayIso < today) return BUSINESS_DAY_MINUTES;
  if (businessDayIso > today) return 0;
  return minutesIntoBusinessDay(now, businessDayIso) + 1;
}

/** Etiqueta de hora del día comercial: minuteOffset 0 = 06:00. */
export function businessMinuteLabel(minuteOffset: number): string {
  const total = BUSINESS_DAY_START_HOUR * 60 + minuteOffset;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isBusinessDayOpen(businessDayIso: string, now: Date = new Date()): boolean {
  return businessDayIso === todayBusinessDayIso(now);
}
