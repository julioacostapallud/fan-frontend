import {
  BUSINESS_DAY_MINUTES,
  BUSINESS_DAY_START_HOUR,
  BUSINESS_TZ,
  EVENT_BUSINESS_DAYS,
  EVENT_ECONOMICS,
} from '../../shared/constants';
import { toBusinessDayIso, todayIsoDate } from '../../shared/dates';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { SaleListItem } from '../../../api/types';

export const RENT = EVENT_ECONOMICS.rentAmount;
export const MARGIN = EVENT_ECONOMICS.grossMarginRate;
export const BREAK_EVEN_REVENUE = RENT / MARGIN;
export const HOURS_PER_BUSINESS_DAY = 24;

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

/** Slot 0 = 06:00–07:00 AR … slot 23 = 05:00–06:00 AR del día calendario siguiente. */
export function businessHourSlot(date: Date): number {
  const zoned = toZonedTime(date, BUSINESS_TZ);
  return (zoned.getHours() - BUSINESS_DAY_START_HOUR + 24) % HOURS_PER_BUSINESS_DAY;
}

/** Hora de pared AR para un slot (6,7,…,23,0,…,5). */
export function wallHourFromSlot(slot: number): number {
  return (BUSINESS_DAY_START_HOUR + slot) % 24;
}

function hourKey(day: string, slot: number): string {
  return `${day}|${slot}`;
}

/** Fracción del día comercial transcurrida (0–1), lineal en el tiempo. */
export function dayProgress(isoDay: string, now = new Date()): number {
  const today = todayIsoDate(now);
  if (isoDay < today) return 1;
  if (isoDay > today) return 0;
  const start = businessDayStartUtc(isoDay).getTime();
  const elapsed = Math.max(0, now.getTime() - start);
  return Math.min(1, elapsed / (BUSINESS_DAY_MINUTES * 60_000));
}

/** Fracción del perfil horario ya transcurrida (incluye fracción de la hora actual). */
export function profileProgress(
  weights: number[],
  isoDay: string,
  now = new Date(),
): number {
  const today = todayIsoDate(now);
  if (isoDay < today) return 1;
  if (isoDay > today) return 0;
  const slot = businessHourSlot(now);
  const zoned = toZonedTime(now, BUSINESS_TZ);
  const hourFrac = Math.min(1, Math.max(0, (zoned.getMinutes() + zoned.getSeconds() / 60) / 60));
  let sum = 0;
  for (let i = 0; i < slot; i += 1) sum += weights[i] ?? 0;
  sum += (weights[slot] ?? 0) * hourFrac;
  return Math.min(1, Math.max(0, sum));
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

export interface HourPoint {
  id: string;
  day: string;
  hourSlot: number;
  wallHour: number;
  /** Etiqueta corta para ticks (solo al inicio del día comercial). */
  tickLabel: string;
  /** Etiqueta completa para tooltip. */
  label: string;
  revenueInHour: number;
  cumulativeReal: number | null;
  cumulativeProjected: number | null;
  netReal: number | null;
  netProjected: number | null;
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
  /** Serie horaria para curvas acumuladas (real + proyectada). */
  hourly: HourPoint[];
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

function uniformWeights(): number[] {
  return Array.from({ length: HOURS_PER_BUSINESS_DAY }, () => 1 / HOURS_PER_BUSINESS_DAY);
}

/** Perfil horario promedio de días comerciales cerrados con ventas. */
export function buildHourlyProfile(
  hourlyReal: Map<string, number>,
  dailyReal: Map<string, number>,
  completedDays: string[],
): number[] {
  const sums = Array.from({ length: HOURS_PER_BUSINESS_DAY }, () => 0);
  let daysUsed = 0;

  for (const day of completedDays) {
    const dayTotal = dailyReal.get(day) ?? 0;
    if (dayTotal <= 0) continue;
    daysUsed += 1;
    for (let slot = 0; slot < HOURS_PER_BUSINESS_DAY; slot += 1) {
      sums[slot] += (hourlyReal.get(hourKey(day, slot)) ?? 0) / dayTotal;
    }
  }

  if (!daysUsed) return uniformWeights();

  const weights = sums.map((s) => s / daysUsed);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return uniformWeights();
  return weights.map((w) => w / total);
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
        // Evita explosiones cuando el ritmo matutino no representa el día.
        const capped = Math.min(blended, Math.max(baseline * 1.35, todayReal));
        out.set(d, Math.max(todayReal, capped));
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

/**
 * Reparte el cierre proyectado de un día en horas.
 * En “hoy”, las horas ya transcurridas usan lo real; el resto del día
 * reparte (proyección − real) con el perfil residual.
 */
function projectedHourlyForDay(
  day: string,
  today: string,
  currentSlot: number,
  dayCloseProj: number,
  dayReal: number,
  hourlyReal: Map<string, number>,
  weights: number[],
): number[] {
  const out = Array.from({ length: HOURS_PER_BUSINESS_DAY }, () => 0);

  if (day < today) {
    for (let slot = 0; slot < HOURS_PER_BUSINESS_DAY; slot += 1) {
      out[slot] = hourlyReal.get(hourKey(day, slot)) ?? 0;
    }
    return out;
  }

  if (day > today) {
    for (let slot = 0; slot < HOURS_PER_BUSINESS_DAY; slot += 1) {
      out[slot] = dayCloseProj * (weights[slot] ?? 0);
    }
    return out;
  }

  // today
  let realSoFar = 0;
  for (let slot = 0; slot <= currentSlot; slot += 1) {
    const actual = hourlyReal.get(hourKey(day, slot)) ?? 0;
    out[slot] = actual;
    realSoFar += actual;
  }

  const remainingBudget = Math.max(0, dayCloseProj - realSoFar);
  let remWeight = 0;
  for (let slot = currentSlot + 1; slot < HOURS_PER_BUSINESS_DAY; slot += 1) {
    remWeight += weights[slot] ?? 0;
  }

  if (remainingBudget > 0) {
    if (remWeight > 0) {
      for (let slot = currentSlot + 1; slot < HOURS_PER_BUSINESS_DAY; slot += 1) {
        out[slot] = remainingBudget * ((weights[slot] ?? 0) / remWeight);
      }
    } else {
      const left = HOURS_PER_BUSINESS_DAY - currentSlot - 1;
      if (left > 0) {
        const each = remainingBudget / left;
        for (let slot = currentSlot + 1; slot < HOURS_PER_BUSINESS_DAY; slot += 1) {
          out[slot] = each;
        }
      }
    }
  }

  // Sanity: dayReal should match realSoFar for completed slots
  void dayReal;
  return out;
}

function buildHourlySeries(
  hourlyReal: Map<string, number>,
  projectedDaily: Map<string, number>,
  dailyReal: Map<string, number>,
  weights: number[],
  today: string,
  now: Date,
): HourPoint[] {
  const currentSlot = businessHourSlot(now);
  const points: HourPoint[] = [];
  let cumReal = 0;
  let cumProj = 0;

  for (const day of EVENT_BUSINESS_DAYS) {
    const kind: HourPoint['kind'] =
      day < today ? 'past' : day === today ? 'today' : 'future';
    const dayCloseProj = projectedDaily.get(day) ?? dailyReal.get(day) ?? 0;
    const dayReal = dailyReal.get(day) ?? 0;
    const projHours = projectedHourlyForDay(
      day,
      today,
      currentSlot,
      dayCloseProj,
      dayReal,
      hourlyReal,
      weights,
    );

    for (let slot = 0; slot < HOURS_PER_BUSINESS_DAY; slot += 1) {
      const actual = hourlyReal.get(hourKey(day, slot)) ?? 0;
      const isRealHour =
        kind === 'past' || (kind === 'today' && slot <= currentSlot);
      /** Proyectada solo desde “ahora” en adelante (no duplicar el pasado). */
      const isProjectedHour =
        kind === 'future' || (kind === 'today' && slot >= currentSlot);

      if (isRealHour) cumReal += actual;
      cumProj += projHours[slot];

      const wallHour = wallHourFromSlot(slot);
      const timeLabel = `${String(wallHour).padStart(2, '0')}:00`;

      points.push({
        id: `${day}-H${String(slot).padStart(2, '0')}`,
        day,
        hourSlot: slot,
        wallHour,
        tickLabel: slot === 0 ? shortLabel(day) : '',
        label: `${shortLabel(day)} · ${timeLabel}`,
        revenueInHour: isRealHour ? actual : 0,
        cumulativeReal: isRealHour ? cumReal : null,
        cumulativeProjected: isProjectedHour ? cumProj : null,
        netReal: isRealHour ? netOf(cumReal) : null,
        netProjected: isProjectedHour ? netOf(cumProj) : null,
        kind,
      });
    }
  }

  return points;
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

/** Equilibrio más preciso sobre la serie horaria proyectada (incluye huecos null). */
function findBreakEvenHourly(
  hourly: HourPoint[],
): { day: string; hourLabel: string } | null {
  const need = BREAK_EVEN_REVENUE;
  for (const p of hourly) {
    if (p.cumulativeProjected != null && p.cumulativeProjected >= need) {
      return {
        day: p.day,
        hourLabel: `${String(p.wallHour).padStart(2, '0')}:00`,
      };
    }
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

  const dailyReal = new Map<string, number>();
  const hourlyReal = new Map<string, number>();
  for (const d of EVENT_BUSINESS_DAYS) dailyReal.set(d, 0);

  const products = new Map<string, { units: number; revenue: number }>();
  const motifs = new Map<string, { units: number; revenue: number }>();

  for (const sale of sales) {
    const at = new Date(sale.createdAt);
    const day = toBusinessDayIso(at);
    if (!dailyReal.has(day)) continue;
    const amount = Number(sale.total);
    dailyReal.set(day, (dailyReal.get(day) ?? 0) + amount);
    const slot = businessHourSlot(at);
    const key = hourKey(day, slot);
    hourlyReal.set(key, (hourlyReal.get(key) ?? 0) + amount);

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

  const completedDays = EVENT_BUSINESS_DAYS.filter((d) => d < today) as string[];
  const weights = buildHourlyProfile(hourlyReal, dailyReal, completedDays);
  // Cierre de “hoy”: progreso por reloj (no por perfil), para no inflar la tarde.
  const progress = dayProgress(today, now);
  const projectedDaily = projectRemainingDaily(dailyReal, today, progress);

  let cumReal = 0;
  let cumProj = 0;
  const days: DayPoint[] = [];

  for (const d of EVENT_BUSINESS_DAYS) {
    const real = dailyReal.get(d) ?? 0;
    const projClose = projectedDaily.get(d) ?? real;
    const kind: DayPoint['kind'] =
      d < today ? 'past' : d === today ? 'today' : 'future';

    if (kind !== 'future') cumReal += real;
    cumProj += kind === 'past' ? real : projClose;

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

  const hourly = buildHourlySeries(
    hourlyReal,
    projectedDaily,
    dailyReal,
    weights,
    today,
    now,
  );

  const revenueNow =
    days.find((d) => d.day === today && d.cumulativeReal != null)?.cumulativeReal ??
    [...days].reverse().find((d) => d.cumulativeReal != null)?.cumulativeReal ??
    0;

  const projectedRevenue = days[days.length - 1]?.cumulativeProjected ?? revenueNow;
  const gross = grossOf(revenueNow);
  const net = netOf(revenueNow);
  const coveragePct = Math.min(100, (gross / RENT) * 100);

  let beFromReal: { day: string; hourLabel: string } | null = null;
  for (const p of hourly) {
    if (p.cumulativeReal != null && p.cumulativeReal >= BREAK_EVEN_REVENUE) {
      beFromReal = {
        day: p.day,
        hourLabel: `${String(p.wallHour).padStart(2, '0')}:00`,
      };
      break;
    }
  }
  const beFromProj = findBreakEvenHourly(hourly);
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
    hourly,
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
