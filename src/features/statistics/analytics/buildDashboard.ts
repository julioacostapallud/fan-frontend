import { getDay, parseISO } from 'date-fns';
import { BUSINESS_DAY_MINUTES } from '../../shared/constants';
import {
  buildIntervalBuckets,
  findBreakEvenMinute,
  metricValue,
  untilMinuteForDay,
} from './buckets';
import { comparisonUntilMinute, listBusinessDays, resolveComparableDays } from './compare';
import {
  RENT_AMOUNT,
  breakEvenRevenue,
  grossProfit,
  netProfit,
  rentCoveragePct,
  revenueNeededForBreakEven,
} from './economics';
import { filterSales } from './normalize';
import {
  breakEvenFromBuckets,
  buildProjection,
  movingAverage,
  velocityTrend,
} from './projection';
import { businessMinuteLabel } from './businessDay';
import type {
  AnalyticsFilters,
  AnalyticsSale,
  IntervalBucket,
  ProjectionResult,
  RankRow,
} from './types';

export interface DashboardModel {
  primaryBuckets: IntervalBucket[];
  compareBuckets: IntervalBucket[] | null;
  compareIsAverage: boolean;
  untilMinute: number;
  kpis: {
    revenue: number;
    salesCount: number;
    units: number;
    avgTicket: number;
    gross: number;
    rent: number;
    net: number;
    coveragePct: number;
    breakEvenTarget: number;
    revenueNeeded: number;
    covered: boolean;
    peakHourLabel: string;
    projectionRevenue: number;
    projectionNet: number;
  };
  projection: ProjectionResult;
  products: RankRow[];
  motifs: RankRow[];
  heatmap: {
    rows: string[];
    cols: string[];
    values: number[][]; // [row][col]
    max: number;
  };
  velocity: {
    values: number[];
    movingAvg: number[];
    labels: string[];
    current: number;
    dayAvg: number;
    max: number;
    maxLabel: string;
    trend: string;
  };
  tableRows: Array<{
    businessDay: string;
    interval: string;
    startMinute: number;
    salesCount: number;
    units: number;
    revenue: number;
    gross: number;
    rentRemaining: number;
    net: number;
    cumRevenue: number;
    cumGross: number;
    compare: number | null;
    diffAbs: number | null;
    diffPct: number | null;
  }>;
}

function averageBuckets(series: IntervalBucket[][]): IntervalBucket[] {
  if (!series.length) return [];
  const len = Math.max(...series.map((s) => s.length));
  const out: IntervalBucket[] = [];
  for (let i = 0; i < len; i++) {
    const present = series.map((s) => s[i]).filter(Boolean);
    const n = present.length || 1;
    const template = present[0] ?? series[0][0];
    const avg = (fn: (b: IntervalBucket) => number) =>
      present.reduce((a, b) => a + fn(b), 0) / n;
    out.push({
      ...template,
      index: i,
      salesCount: avg((b) => b.salesCount),
      units: avg((b) => b.units),
      revenue: avg((b) => b.revenue),
      grossProfit: avg((b) => b.grossProfit),
      netProfit: avg((b) => b.netProfit),
      cumulativeRevenue: avg((b) => b.cumulativeRevenue),
      cumulativeUnits: avg((b) => b.cumulativeUnits),
      cumulativeSales: avg((b) => b.cumulativeSales),
      cumulativeGross: avg((b) => b.cumulativeGross),
      cumulativeNet: avg((b) => b.cumulativeNet),
      rentRemaining: avg((b) => b.rentRemaining),
    });
  }
  // recompute cumulatives properly from averaged interval revenues
  let cumR = 0;
  let cumU = 0;
  let cumS = 0;
  for (const b of out) {
    cumR += b.revenue;
    cumU += b.units;
    cumS += b.salesCount;
    b.cumulativeRevenue = cumR;
    b.cumulativeUnits = cumU;
    b.cumulativeSales = cumS;
    b.cumulativeGross = grossProfit(cumR);
    b.cumulativeNet = netProfit(cumR);
    b.grossProfit = grossProfit(b.revenue);
    b.rentRemaining = Math.max(0, RENT_AMOUNT - b.cumulativeGross);
  }
  return out;
}

function rankEntities(
  sales: AnalyticsSale[],
  kind: 'product' | 'motif',
  compareSales: AnalyticsSale[] | null,
): RankRow[] {
  const map = new Map<string, RankRow>();
  for (const s of sales) {
    for (const it of s.items) {
      const id = kind === 'product' ? it.productId : it.motifName;
      const name = kind === 'product' ? it.productName : it.motifName;
      let row = map.get(id);
      if (!row) {
        row = { id, name, units: 0, revenue: 0, grossProfit: 0, share: 0, growth: null };
        map.set(id, row);
      }
      row.units += it.quantity;
      row.revenue += it.lineTotal;
    }
  }
  const total = [...map.values()].reduce((a, r) => a + r.revenue, 0) || 1;
  for (const r of map.values()) {
    r.grossProfit = grossProfit(r.revenue);
    r.share = (r.revenue / total) * 100;
  }

  if (compareSales) {
    const cmp = new Map<string, number>();
    for (const s of compareSales) {
      for (const it of s.items) {
        const id = kind === 'product' ? it.productId : it.motifName;
        cmp.set(id, (cmp.get(id) ?? 0) + it.lineTotal);
      }
    }
    for (const r of map.values()) {
      const prev = cmp.get(r.id) ?? 0;
      r.growth = prev > 0 ? ((r.revenue - prev) / prev) * 100 : null;
    }
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export function buildDashboard(
  allSales: AnalyticsSale[],
  filters: AnalyticsFilters,
  now = new Date(),
): DashboardModel {
  const untilMinute = comparisonUntilMinute(
    filters.day,
    filters.compareFullHistorical,
    now,
  );

  const daySales = filterSales(allSales, {
    day: filters.day,
    motifName: filters.motifName,
    productId: filters.productId,
    maxMinutesExclusive: untilMinute,
  });

  const primaryBuckets = buildIntervalBuckets(daySales, filters.interval, {
    productId: filters.productId,
    motifName: filters.motifName,
    untilMinute,
  });

  const compareDays = resolveComparableDays(
    allSales,
    filters.day,
    filters.comparison,
    filters.customCompareDay,
  );

  const compareSeries = compareDays.map((d) => {
    const sales = filterSales(allSales, {
      day: d,
      motifName: filters.motifName,
      productId: filters.productId,
      maxMinutesExclusive: untilMinute,
    });
    return buildIntervalBuckets(sales, filters.interval, {
      productId: filters.productId,
      motifName: filters.motifName,
      untilMinute,
    });
  });

  const compareIsAverage = compareSeries.length > 1;
  const compareBuckets =
    compareSeries.length === 0
      ? null
      : compareSeries.length === 1
        ? compareSeries[0]
        : averageBuckets(compareSeries);

  const last = primaryBuckets[primaryBuckets.length - 1];
  const revenue = last?.cumulativeRevenue ?? 0;
  const salesCount = last?.cumulativeSales ?? 0;
  const units = last?.cumulativeUnits ?? 0;
  const gross = grossProfit(revenue);
  const net = netProfit(revenue);
  const covered = gross >= RENT_AMOUNT;

  let peakIdx = 0;
  for (let i = 1; i < primaryBuckets.length; i++) {
    if (primaryBuckets[i].revenue > primaryBuckets[peakIdx].revenue) peakIdx = i;
  }

  // Historical for projection: full-day finals of comparable weekdays
  const histDays = resolveComparableDays(
    allSales,
    filters.day,
    filters.comparison === 'none' ? 'sameWeekdayPrev' : filters.comparison,
    filters.customCompareDay,
  );
  const histFinalRevenue: number[] = [];
  const histRevenueAtNow: number[] = [];
  for (const d of histDays) {
    const full = filterSales(allSales, { day: d });
    const fullB = buildIntervalBuckets(full, filters.interval, {
      productId: null,
      motifName: null,
      untilMinute: BUSINESS_DAY_MINUTES,
    });
    const atNow = buildIntervalBuckets(full, filters.interval, {
      productId: null,
      motifName: null,
      untilMinute,
    });
    histFinalRevenue.push(fullB[fullB.length - 1]?.cumulativeRevenue ?? 0);
    histRevenueAtNow.push(atNow[atNow.length - 1]?.cumulativeRevenue ?? 0);
  }

  // General share: all past days averaged
  const pastDays = listBusinessDays(allSales).filter((d) => d < filters.day);
  let generalShare: number | null = null;
  if (pastDays.length) {
    const shares: number[] = [];
    for (const d of pastDays) {
      const full = filterSales(allSales, { day: d });
      const fullB = buildIntervalBuckets(full, 60, {
        productId: null,
        motifName: null,
        untilMinute: BUSINESS_DAY_MINUTES,
      });
      const atNow = buildIntervalBuckets(full, 60, {
        productId: null,
        motifName: null,
        untilMinute,
      });
      const fin = fullB[fullB.length - 1]?.cumulativeRevenue ?? 0;
      const nowR = atNow[atNow.length - 1]?.cumulativeRevenue ?? 0;
      if (fin > 0) shares.push(nowR / fin);
    }
    if (shares.length) {
      generalShare = shares.reduce((a, b) => a + b, 0) / shares.length;
    }
  }

  const projection = buildProjection({
    currentRevenue: revenue,
    currentUnits: units,
    currentSales: salesCount,
    elapsedMinutes: untilMinute,
    histFinalRevenue,
    histRevenueAtNow,
    generalShareAtNow: generalShare,
  });

  const probable = projection.scenarios.find((s) => s.key === 'probable')!;

  // Heatmap
  const heatDays =
    filters.rangeFrom && filters.rangeTo
      ? listBusinessDays(allSales).filter(
          (d) => d >= filters.rangeFrom! && d <= filters.rangeTo!,
        )
      : listBusinessDays(allSales);
  const hourCols = Array.from({ length: 24 }, (_, h) => businessMinuteLabel(h * 60));
  let rows: string[] = [];
  let values: number[][] = [];

  if (filters.heatmapMode === 'byWeekday') {
    rows = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const acc = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ s: 0, n: 0 })));
    for (const d of heatDays) {
      const wd = getDay(parseISO(d));
      const daySalesH = filterSales(allSales, { day: d });
      const b = buildIntervalBuckets(daySalesH, 60, {
        productId: filters.productId,
        motifName: filters.motifName,
        untilMinute: BUSINESS_DAY_MINUTES,
      });
      for (let h = 0; h < 24; h++) {
        const cell = b[h];
        const v =
          filters.metric === 'units'
            ? cell?.units ?? 0
            : filters.metric === 'salesCount'
              ? cell?.salesCount ?? 0
              : filters.metric === 'grossProfit'
                ? cell?.grossProfit ?? 0
                : cell?.revenue ?? 0;
        acc[wd][h].s += v;
        acc[wd][h].n += 1;
      }
    }
    values = acc.map((row) => row.map((c) => (c.n ? c.s / c.n : 0)));
  } else {
    rows = heatDays.slice(-14);
    values = rows.map((d) => {
      const daySalesH = filterSales(allSales, { day: d });
      const b = buildIntervalBuckets(daySalesH, 60, {
        productId: filters.productId,
        motifName: filters.motifName,
        untilMinute: BUSINESS_DAY_MINUTES,
      });
      return Array.from({ length: 24 }, (_, h) => {
        const cell = b[h];
        if (filters.metric === 'units') return cell?.units ?? 0;
        if (filters.metric === 'salesCount') return cell?.salesCount ?? 0;
        if (filters.metric === 'grossProfit') return cell?.grossProfit ?? 0;
        return cell?.revenue ?? 0;
      });
    });
  }
  const max = Math.max(1, ...values.flat());

  // Velocity
  const velValues = primaryBuckets.map((b) =>
    metricValue(b, filters.intervalMetric === 'grossProfit' ? 'grossProfit' : filters.intervalMetric, false),
  );
  const mavg = movingAverage(velValues, 3);
  let maxV = 0;
  let maxVi = 0;
  velValues.forEach((v, i) => {
    if (v > maxV) {
      maxV = v;
      maxVi = i;
    }
  });
  const recent = velValues.slice(-3);
  const trend = velocityTrend(recent);

  const compareSalesForRank =
    compareDays.length > 0
      ? filterSales(allSales, {
          // multi-day: flatten
          motifName: filters.motifName,
          productId: filters.productId,
        }).filter((s) => compareDays.includes(s.businessDay))
      : null;

  let products = rankEntities(daySales, 'product', compareSalesForRank);
  let motifs = rankEntities(daySales, 'motif', compareSalesForRank);

  const sortKey = filters.productSort;
  const sorter = (a: RankRow, b: RankRow) => {
    if (sortKey === 'units') return b.units - a.units;
    if (sortKey === 'grossProfit') return b.grossProfit - a.grossProfit;
    if (sortKey === 'share') return b.share - a.share;
    if (sortKey === 'growth') return (b.growth ?? -Infinity) - (a.growth ?? -Infinity);
    return b.revenue - a.revenue;
  };
  products = products.sort(sorter);
  motifs = motifs.sort(sorter);

  const tableRows = primaryBuckets.map((b, i) => {
    const cmp = compareBuckets?.[i];
    const compareVal = cmp ? metricValue(cmp, filters.metric, false) : null;
    const cur = metricValue(b, filters.metric, false);
    const diffAbs = compareVal != null ? cur - compareVal : null;
    const diffPct =
      compareVal != null && compareVal !== 0 ? (diffAbs! / compareVal) * 100 : null;
    return {
      businessDay: filters.day,
      interval: b.label,
      startMinute: b.startMinute,
      salesCount: b.salesCount,
      units: b.units,
      revenue: b.revenue,
      gross: b.grossProfit,
      rentRemaining: b.rentRemaining,
      net: b.cumulativeNet,
      cumRevenue: b.cumulativeRevenue,
      cumGross: b.cumulativeGross,
      compare: compareVal,
      diffAbs,
      diffPct,
    };
  });

  return {
    primaryBuckets,
    compareBuckets,
    compareIsAverage,
    untilMinute,
    kpis: {
      revenue,
      salesCount,
      units,
      avgTicket: salesCount ? revenue / salesCount : 0,
      gross,
      rent: RENT_AMOUNT,
      net,
      coveragePct: rentCoveragePct(revenue),
      breakEvenTarget: breakEvenRevenue(),
      revenueNeeded: revenueNeededForBreakEven(revenue),
      covered,
      peakHourLabel: primaryBuckets[peakIdx]?.label ?? '—',
      projectionRevenue: probable.revenue,
      projectionNet: probable.netProfit,
    },
    projection,
    products,
    motifs,
    heatmap: { rows, cols: hourCols, values, max },
    velocity: {
      values: velValues,
      movingAvg: mavg,
      labels: primaryBuckets.map((b) => businessMinuteLabel(b.startMinute)),
      current: velValues[velValues.length - 1] ?? 0,
      dayAvg: velValues.length
        ? velValues.reduce((a, b) => a + b, 0) / velValues.length
        : 0,
      max: maxV,
      maxLabel: primaryBuckets[maxVi]
        ? businessMinuteLabel(primaryBuckets[maxVi].startMinute)
        : '—',
      trend,
    },
    tableRows,
  };
}

export { findBreakEvenMinute, breakEvenFromBuckets, untilMinuteForDay, metricValue };
