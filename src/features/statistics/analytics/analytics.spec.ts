import { describe, expect, it } from 'vitest';
import {
  businessDayStartUtc,
  minutesIntoBusinessDay,
  toBusinessDayIso,
} from './businessDay';
import {
  breakEvenRevenue,
  grossProfit,
  netProfit,
  rentCoveragePct,
} from './economics';
import { buildIntervalBuckets } from './buckets';
import { buildProjection } from './projection';
import { CHART_COLORS, seriesColor } from './chartColors';
import type { AnalyticsSale } from './types';

function saleAt(isoLocalApproxUtc: string, total: number, dayHint?: string): AnalyticsSale {
  const createdAt = new Date(isoLocalApproxUtc);
  const businessDay = dayHint ?? toBusinessDayIso(createdAt);
  return {
    id: isoLocalApproxUtc,
    createdAt,
    businessDay,
    minutesIntoDay: minutesIntoBusinessDay(createdAt, businessDay),
    total,
    units: 1,
    items: [
      {
        productId: 'p1',
        productName: 'Gorra',
        motifId: 'm1',
        motifName: 'Racing',
        quantity: 1,
        lineTotal: total,
      },
    ],
  };
}

describe('business day 06:00', () => {
  it('assigns pre-6am to previous calendar day', () => {
    // 19/07 02:30 AR = 05:30 UTC
    const d = new Date('2026-07-19T05:30:00.000Z');
    expect(toBusinessDayIso(d)).toBe('2026-07-18');
  });

  it('assigns 06:00 AR to new business day', () => {
    const d = new Date('2026-07-19T09:00:00.000Z');
    expect(toBusinessDayIso(d)).toBe('2026-07-19');
  });

  it('minutesIntoBusinessDay crosses midnight', () => {
    const day = '2026-07-18';
    const start = businessDayStartUtc(day);
    expect(minutesIntoBusinessDay(start, day)).toBe(0);
    // 19/07 00:00 AR = 03:00 UTC → 18h into day = 1080 minutes
    const midnight = new Date('2026-07-19T03:00:00.000Z');
    expect(toBusinessDayIso(midnight)).toBe('2026-07-18');
    expect(minutesIntoBusinessDay(midnight, day)).toBe(18 * 60);
  });
});

describe('economics', () => {
  it('gross margin 60%', () => {
    expect(grossProfit(10_000)).toBe(6000);
  });

  it('break-even revenue = rent / 0.6', () => {
    expect(breakEvenRevenue()).toBeCloseTo(2_500_000 / 0.6);
  });

  it('net negative before covering rent', () => {
    expect(netProfit(1_000_000)).toBeLessThan(0);
    expect(rentCoveragePct(1_000_000)).toBeLessThan(100);
  });

  it('net positive after covering rent', () => {
    const need = breakEvenRevenue();
    expect(netProfit(need)).toBeCloseTo(0);
    expect(netProfit(need + 10_000)).toBeCloseTo(6000);
  });
});

describe('buckets', () => {
  it('fills empty intervals with zero and accumulates from 06:00', () => {
    const sales = [
      saleAt('2026-07-18T12:00:00.000Z', 10000, '2026-07-18'), // 09:00 AR
    ];
    // Fix minutes for controlled test
    sales[0].minutesIntoDay = 3 * 60; // 09:00
    const buckets = buildIntervalBuckets(sales, 60, {
      productId: null,
      motifName: null,
      untilMinute: 5 * 60,
    });
    expect(buckets.length).toBe(5);
    expect(buckets[0].revenue).toBe(0);
    expect(buckets[3].revenue).toBe(10000);
    expect(buckets[4].cumulativeRevenue).toBe(10000);
  });
});

describe('projection', () => {
  it('uses historical share when available', () => {
    const p = buildProjection({
      currentRevenue: 650_000,
      currentUnits: 65,
      currentSales: 40,
      elapsedMinutes: 600,
      histFinalRevenue: [1_000_000, 1_200_000],
      histRevenueAtNow: [650_000, 780_000],
      generalShareAtNow: null,
    });
    expect(p.confidence).not.toBe('baja');
    expect(p.scenarios[1].revenue).toBeGreaterThan(650_000);
  });

  it('falls back to time share without history', () => {
    const p = buildProjection({
      currentRevenue: 100_000,
      currentUnits: 10,
      currentSales: 5,
      elapsedMinutes: 720,
      histFinalRevenue: [],
      histRevenueAtNow: [],
      generalShareAtNow: null,
    });
    expect(p.method.toLowerCase()).toContain('ritmo');
  });
});

describe('chart colors', () => {
  it('are stable across renders', () => {
    expect(seriesColor(0)).toBe(CHART_COLORS.series[0]);
    expect(seriesColor(10)).toBe(CHART_COLORS.series[0]);
    expect(CHART_COLORS.current).toBe('#e11d48');
    expect(CHART_COLORS.projection).toBe('#f59e0b');
  });
});
