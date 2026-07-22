import {
  BUSINESS_DAY_MINUTES,
  BUSINESS_DAY_START_HOUR,
  BUSINESS_TZ,
  EVENT_BUSINESS_DAYS,
  EVENT_ECONOMICS,
} from '../../shared/constants';
import { toBusinessDayIso, todayIsoDate } from '../../shared/dates';
import { fromZonedTime } from 'date-fns-tz';
import type { SaleListItem } from '../../../api/types';

export const RENT = EVENT_ECONOMICS.rentAmount;
export const MARGIN = EVENT_ECONOMICS.grossMarginRate;
export const BREAK_EVEN_REVENUE = RENT / MARGIN;

function wallToUtc(isoDay: string, hour: number, minute = 0): Date {
  const [y, m, d] = isoDay.split('-').map(Number);
  return fromZonedTime(new Date(y, m - 1, d, hour, minute, 0, 0), BUSINESS_TZ);
}

export function businessDayStartUtc(isoDay: string): Date {
  return wallToUtc(isoDay, BUSINESS_DAY_START_HOUR);
}

export function grossOf(revenue: number): number {
  return revenue * MARGIN;
}

export function netOf(revenue: number): number {
  return grossOf(revenue) - RENT;
}

/** Fracción del día comercial transcurrida (0–1). */
export function dayProgress(isoDay: string, now = new Date()): number {
  const today = todayIsoDate(now);
  if (isoDay < today) return 1;
  if (isoDay > today) return 0;
  const start = businessDayStartUtc(isoDay).getTime();
  const elapsed = Math.max(0, now.getTime() - start);
  return Math.min(1, elapsed / (BUSINESS_DAY_MINUTES * 60_000));
}

export interface DayPoint {
  day: string;
  label: string;
  revenue: number;
  projectedDayClose: number;
  cumulativeReal: number | null;
  cumulativeProjected: number;
  netReal: number | null;
  netProjected: number;
  kind: 'past' | 'today' | 'future';
}

export interface RankItem {
  name: string;
  units: number;
  revenue: number;
  share: number;
  gross: number;
}

export interface Scenario {
  key: 'conservative' | 'probable' | 'optimistic';
  label: string;
  revenue: number;
  gross: number;
  net: number;
  breakEvenDay: string | null;
}

export interface EventModel {
  today: string;
  days: DayPoint[];
  kpis: {
    revenue: number;
    gross: number;
    net: number;
    rent: number;
    coveragePct: number;
    projectedRevenue: number;
    projectedNet: number;
    breakEvenDay: string | null;
    breakEvenHourLabel: string | null;
    revenueToBreakEven: number;
    grossToBreakEven: number;
  };
  scenarios: Scenario[];
  products: RankItem[];
  motifs: RankItem[];
}

function shortLabel(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function projectRemainingDaily(
  dailyReal: Map<string, number>,
  today: string,
  todayProgress: number,
): Map<string, number> {
  const completed = EVENT_BUSINESS_DAYS.filter((d) => d < today);
  const completedRevs = completed.map((d) => dailyReal.get(d) ?? 0);
  const positive = completedRevs.filter((v) => v > 0);
  const overall = avg(positive.length ? positive : completedRevs);
  const recentSlice = completedRevs.slice(-3).filter((v) => v > 0);
  const recent = avg(recentSlice.length ? recentSlice : positive) || overall;
  const baseline = overall * 0.4 + recent * 0.6;

  const out = new Map<string, number>();
  const todayReal = dailyReal.get(today) ?? 0;

  for (const d of EVENT_BUSINESS_DAYS) {
    if (d < today) {
      out.set(d, dailyReal.get(d) ?? 0);
    } else if (d === today) {
      if (todayProgress <= 0.02) {
        out.set(d, Math.max(todayReal, baseline));
      } else {
        const pace = todayReal / todayProgress;
        const blended = pace * 0.55 + baseline * 0.45;
        out.set(d, Math.max(todayReal, blended));
      }
    } else {
      let trend = 1;
      if (completedRevs.length >= 4) {
        const early = avg(completedRevs.slice(0, 2).filter((v) => v > 0)) || overall || 1;
        const late = avg(completedRevs.slice(-2).filter((v) => v > 0)) || early;
        trend = Math.min(1.25, Math.max(0.75, late / early));
      }
      out.set(d, baseline * trend);
    }
  }
  return out;
}

function findBreakEven(
  cumulativeByDay: { day: string; cum: number }[],
): { day: string; hourLabel: string } | null {
  const need = BREAK_EVEN_REVENUE;
  let prev = 0;
  for (const row of cumulativeByDay) {
    if (row.cum >= need) {
      const dayRev = row.cum - prev;
      const needInDay = need - prev;
      const frac = dayRev > 0 ? Math.min(1, Math.max(0, needInDay / dayRev)) : 0;
      const minutes = Math.round(frac * BUSINESS_DAY_MINUTES);
      const totalMin = BUSINESS_DAY_START_HOUR * 60 + minutes;
      const h = Math.floor(totalMin / 60) % 24;
      const m = totalMin % 60;
      return {
        day: row.day,
        hourLabel: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      };
    }
    prev = row.cum;
  }
  return null;
}

function rankMap(map: Map<string, { units: number; revenue: number }>): RankItem[] {
  const total = [...map.values()].reduce((s, v) => s + v.revenue, 0) || 1;
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      units: v.units,
      revenue: v.revenue,
      share: (v.revenue / total) * 100,
      gross: grossOf(v.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);
}

function scenarioBreakEvenDay(
  dailyReal: Map<string, number>,
  projectedDaily: Map<string, number>,
  today: string,
  factor: number,
): string | null {
  let c = 0;
  const series: { day: string; cum: number }[] = [];
  for (const d of EVENT_BUSINESS_DAYS) {
    let add: number;
    if (d < today) add = dailyReal.get(d) ?? 0;
    else if (d === today) {
      const real = dailyReal.get(d) ?? 0;
      const close = (projectedDaily.get(d) ?? real) * factor;
      add = Math.max(real, close);
    } else add = (projectedDaily.get(d) ?? 0) * factor;
    c += add;
    series.push({ day: d, cum: c });
  }
  return findBreakEven(series)?.day ?? null;
}

export function buildEventModel(sales: SaleListItem[], now = new Date()): EventModel {
  const today = todayIsoDate(now);
  const progress = dayProgress(today, now);

  const dailyReal = new Map<string, number>();
  for (const d of EVENT_BUSINESS_DAYS) dailyReal.set(d, 0);

  const products = new Map<string, { units: number; revenue: number }>();
  const motifs = new Map<string, { units: number; revenue: number }>();

  for (const sale of sales) {
    const day = toBusinessDayIso(new Date(sale.createdAt));
    if (!dailyReal.has(day)) continue;
    dailyReal.set(day, (dailyReal.get(day) ?? 0) + Number(sale.total));
    for (const it of sale.items ?? []) {
      const pName = it.product?.name ?? '—';
      const mName = it.motif?.name ?? '—';
      const line = Number(it.lineTotal);
      const qty = it.quantity;
      const p = products.get(pName) ?? { units: 0, revenue: 0 };
      p.units += qty;
      p.revenue += line;
      products.set(pName, p);
      const m = motifs.get(mName) ?? { units: 0, revenue: 0 };
      m.units += qty;
      m.revenue += line;
      motifs.set(mName, m);
    }
  }

  const projectedDaily = projectRemainingDaily(dailyReal, today, progress);

  let cumReal = 0;
  let cumProj = 0;
  const days: DayPoint[] = [];
  const cumForBreakEven: { day: string; cum: number }[] = [];

  for (const d of EVENT_BUSINESS_DAYS) {
    const real = dailyReal.get(d) ?? 0;
    const projClose = projectedDaily.get(d) ?? real;
    const kind: DayPoint['kind'] =
      d < today ? 'past' : d === today ? 'today' : 'future';

    if (kind !== 'future') cumReal += real;
    cumProj += kind === 'past' ? real : projClose;
    cumForBreakEven.push({ day: d, cum: cumProj });

    days.push({
      day: d,
      label: shortLabel(d),
      revenue: real,
      projectedDayClose: projClose,
      cumulativeReal: kind === 'future' ? null : cumReal,
      cumulativeProjected: cumProj,
      netReal: kind === 'future' ? null : netOf(cumReal),
      netProjected: netOf(cumProj),
      kind,
    });
  }

  const revenueNow =
    days.find((d) => d.day === today && d.cumulativeReal != null)?.cumulativeReal ??
    [...days].reverse().find((d) => d.cumulativeReal != null)?.cumulativeReal ??
    0;

  const projectedRevenue = days[days.length - 1]?.cumulativeProjected ?? revenueNow;
  const gross = grossOf(revenueNow);
  const net = netOf(revenueNow);
  const coveragePct = Math.min(100, (gross / RENT) * 100);

  const beFromReal = findBreakEven(
    days
      .filter((d) => d.cumulativeReal != null)
      .map((d) => ({ day: d.day, cum: d.cumulativeReal! })),
  );
  const beFromProj = findBreakEven(cumForBreakEven);
  const breakEven = beFromReal ?? beFromProj;

  const scenarios: Scenario[] = [
    {
      key: 'conservative',
      label: 'Conservador',
      revenue: projectedRevenue * 0.88,
      gross: grossOf(projectedRevenue * 0.88),
      net: netOf(projectedRevenue * 0.88),
      breakEvenDay: scenarioBreakEvenDay(dailyReal, projectedDaily, today, 0.88),
    },
    {
      key: 'probable',
      label: 'Probable',
      revenue: projectedRevenue,
      gross: grossOf(projectedRevenue),
      net: netOf(projectedRevenue),
      breakEvenDay: scenarioBreakEvenDay(dailyReal, projectedDaily, today, 1),
    },
    {
      key: 'optimistic',
      label: 'Optimista',
      revenue: projectedRevenue * 1.14,
      gross: grossOf(projectedRevenue * 1.14),
      net: netOf(projectedRevenue * 1.14),
      breakEvenDay: scenarioBreakEvenDay(dailyReal, projectedDaily, today, 1.14),
    },
  ];

  return {
    today,
    days,
    kpis: {
      revenue: revenueNow,
      gross,
      net,
      rent: RENT,
      coveragePct,
      projectedRevenue,
      projectedNet: netOf(projectedRevenue),
      breakEvenDay: breakEven?.day ?? null,
      breakEvenHourLabel: breakEven?.hourLabel ?? null,
      revenueToBreakEven: Math.max(0, BREAK_EVEN_REVENUE - revenueNow),
      grossToBreakEven: Math.max(0, RENT - gross),
    },
    scenarios,
    products: rankMap(products),
    motifs: rankMap(motifs),
  };
}

export { EVENT_BUSINESS_DAYS, toBusinessDayIso };
