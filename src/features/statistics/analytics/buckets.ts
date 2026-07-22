import { BUSINESS_DAY_MINUTES } from '../../shared/constants';
import {
  businessMinuteLabel,
  elapsedBusinessMinutes,
} from './businessDay';
import {
  GROSS_MARGIN_RATE,
  RENT_AMOUNT,
  grossProfit,
  netProfit,
} from './economics';
import { saleMetricsForFilters } from './normalize';
import type { AnalyticsSale, IntervalBucket, IntervalMinutes } from './types';

export function buildIntervalBuckets(
  sales: AnalyticsSale[],
  interval: IntervalMinutes,
  opts: {
    productId: string | null;
    motifName: string | null;
    /** Limitar buckets hasta este minuto (exclusivo). Si omitido = día completo. */
    untilMinute?: number;
  },
): IntervalBucket[] {
  const until = Math.min(
    opts.untilMinute ?? BUSINESS_DAY_MINUTES,
    BUSINESS_DAY_MINUTES,
  );
  const count = Math.ceil(until / interval) || 1;
  const buckets: IntervalBucket[] = [];

  for (let i = 0; i < count; i++) {
    const startMinute = i * interval;
    const endMinute = Math.min(startMinute + interval, until);
    buckets.push({
      index: i,
      startMinute,
      endMinute,
      label: `${businessMinuteLabel(startMinute)}–${businessMinuteLabel(endMinute % BUSINESS_DAY_MINUTES === 0 && endMinute > 0 ? BUSINESS_DAY_MINUTES : endMinute)}`,
      salesCount: 0,
      units: 0,
      revenue: 0,
      grossProfit: 0,
      netProfit: 0,
      cumulativeRevenue: 0,
      cumulativeUnits: 0,
      cumulativeSales: 0,
      cumulativeGross: 0,
      cumulativeNet: 0,
      rentRemaining: RENT_AMOUNT,
    });
  }

  // Fix end label for last slot at 06:00
  if (buckets.length) {
    const last = buckets[buckets.length - 1];
    last.label = `${businessMinuteLabel(last.startMinute)}–${businessMinuteLabel(last.endMinute >= BUSINESS_DAY_MINUTES ? 0 : last.endMinute)}`;
    if (last.endMinute >= BUSINESS_DAY_MINUTES) {
      last.label = `${businessMinuteLabel(last.startMinute)}–06:00`;
    }
  }

  for (const sale of sales) {
    if (sale.minutesIntoDay >= until) continue;
    const idx = Math.floor(sale.minutesIntoDay / interval);
    if (idx < 0 || idx >= buckets.length) continue;
    const m = saleMetricsForFilters(sale, opts.productId, opts.motifName);
    if (m.salesCount === 0) continue;
    const b = buckets[idx];
    b.salesCount += m.salesCount;
    b.units += m.units;
    b.revenue += m.revenue;
  }

  let cumRev = 0;
  let cumUnits = 0;
  let cumSales = 0;
  for (const b of buckets) {
    b.grossProfit = grossProfit(b.revenue);
    cumRev += b.revenue;
    cumUnits += b.units;
    cumSales += b.salesCount;
    b.cumulativeRevenue = cumRev;
    b.cumulativeUnits = cumUnits;
    b.cumulativeSales = cumSales;
    b.cumulativeGross = grossProfit(cumRev);
    b.cumulativeNet = netProfit(cumRev);
    b.netProfit = b.grossProfit; // interval-level gross; net is cumulative context
    b.rentRemaining = Math.max(0, RENT_AMOUNT - b.cumulativeGross);
  }

  return buckets;
}

export function metricValue(
  bucket: IntervalBucket,
  metric: 'salesCount' | 'units' | 'revenue' | 'grossProfit' | 'netProfit',
  cumulative: boolean,
): number {
  if (cumulative) {
    switch (metric) {
      case 'salesCount':
        return bucket.cumulativeSales;
      case 'units':
        return bucket.cumulativeUnits;
      case 'revenue':
        return bucket.cumulativeRevenue;
      case 'grossProfit':
        return bucket.cumulativeGross;
      case 'netProfit':
        return bucket.cumulativeNet;
    }
  }
  switch (metric) {
    case 'salesCount':
      return bucket.salesCount;
    case 'units':
      return bucket.units;
    case 'revenue':
      return bucket.revenue;
    case 'grossProfit':
      return bucket.grossProfit;
    case 'netProfit':
      return netProfit(bucket.cumulativeRevenue) - netProfit(bucket.cumulativeRevenue - bucket.revenue);
  }
}

export function findBreakEvenMinute(buckets: IntervalBucket[]): number | null {
  for (const b of buckets) {
    if (b.cumulativeGross >= RENT_AMOUNT) {
      // approximate within interval by linear revenue share
      if (b.revenue <= 0) return b.startMinute;
      const prevGross = b.cumulativeGross - b.grossProfit;
      const need = RENT_AMOUNT - prevGross;
      const frac = Math.min(1, Math.max(0, need / b.grossProfit));
      return Math.round(b.startMinute + frac * (b.endMinute - b.startMinute));
    }
  }
  return null;
}

export function untilMinuteForDay(day: string, now = new Date()): number {
  return elapsedBusinessMinutes(day, now);
}

export { GROSS_MARGIN_RATE };
