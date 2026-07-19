import { formatInTimeZone } from 'date-fns-tz';
import { BUSINESS_TZ } from './constants';

export function formatSaleDate(iso: string): string {
  return formatInTimeZone(new Date(iso), BUSINESS_TZ, 'dd/MM/yyyy');
}

export function formatSaleTime(iso: string): string {
  return formatInTimeZone(new Date(iso), BUSINESS_TZ, 'HH:mm');
}

export function formatSaleDateTime(iso: string): string {
  return formatInTimeZone(new Date(iso), BUSINESS_TZ, "dd/MM/yyyy '·' HH:mm");
}

export function todayIsoDate(): string {
  return formatInTimeZone(new Date(), BUSINESS_TZ, 'yyyy-MM-dd');
}
