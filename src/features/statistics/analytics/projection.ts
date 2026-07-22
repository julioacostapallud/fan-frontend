import { BUSINESS_DAY_MINUTES } from '../../shared/constants';
import { businessMinuteLabel } from './businessDay';
import {
  RENT_AMOUNT,
  breakEvenRevenue,
  grossProfit,
  netProfit,
} from './economics';
import type { IntervalBucket, ProjectionResult, ProjectionScenario } from './types';

function avgShareAtMinute(
  historicalFinals: number[],
  historicalAtNow: number[],
): number | null {
  const shares: number[] = [];
  for (let i = 0; i < historicalFinals.length; i++) {
    const fin = historicalFinals[i];
    const now = historicalAtNow[i];
    if (fin > 0 && now >= 0) shares.push(now / fin);
  }
  if (!shares.length) return null;
  return shares.reduce((a, b) => a + b, 0) / shares.length;
}

/**
 * Proyección de cierre: prioriza curva histórica equivalente.
 * Escenarios conservador / probable / optimista.
 */
export function buildProjection(input: {
  currentRevenue: number;
  currentUnits: number;
  currentSales: number;
  elapsedMinutes: number;
  /** Facturación final de días históricos equivalentes */
  histFinalRevenue: number[];
  /** Facturación de esos días a la misma hora relativa */
  histRevenueAtNow: number[];
  /** Distribución general: share acumulado a este minuto (0–1) */
  generalShareAtNow: number | null;
}): ProjectionResult {
  const {
    currentRevenue,
    currentUnits,
    currentSales,
    elapsedMinutes,
    histFinalRevenue,
    histRevenueAtNow,
    generalShareAtNow,
  } = input;

  let method =
    'Ritmo actual (sin antecedentes suficientes): proyección lineal por tiempo transcurrido.';
  let confidence: ProjectionResult['confidence'] = 'baja';
  let share = elapsedMinutes > 0 ? elapsedMinutes / BUSINESS_DAY_MINUTES : 0;

  const histShare = avgShareAtMinute(histFinalRevenue, histRevenueAtNow);
  if (histShare != null && histShare > 0.05 && histFinalRevenue.length >= 2) {
    share = histShare;
    method = `Curva histórica de ${histFinalRevenue.length} días equivalentes (share a esta hora ≈ ${(histShare * 100).toFixed(0)}%).`;
    confidence = histFinalRevenue.length >= 4 ? 'alta' : 'media';
  } else if (histShare != null && histShare > 0.05 && histFinalRevenue.length === 1) {
    share = histShare;
    method =
      'Curva del mismo día de la semana / día equivalente disponible.';
    confidence = 'media';
  } else if (generalShareAtNow != null && generalShareAtNow > 0.05) {
    share = generalShareAtNow;
    method = 'Distribución horaria general del evento.';
    confidence = 'media';
  }

  const safeShare = Math.min(0.98, Math.max(0.08, share));
  const probableRevenue = currentRevenue / safeShare;
  const scaleUnits = currentRevenue > 0 ? probableRevenue / currentRevenue : 1;
  const probableUnits = currentUnits * scaleUnits;
  const probableSales = currentSales * scaleUnits;

  function scenario(
    key: ProjectionScenario['key'],
    label: string,
    factor: number,
  ): ProjectionScenario {
    const revenue = probableRevenue * factor;
    const gross = grossProfit(revenue);
    const net = netProfit(revenue);
    let breakEvenMinute: number | null = null;
    if (gross >= RENT_AMOUNT && currentRevenue > 0) {
      const needRev = breakEvenRevenue();
      if (currentRevenue >= needRev) {
        breakEvenMinute = elapsedMinutes;
      } else if (revenue >= needRev) {
        const frac = needRev / revenue;
        breakEvenMinute = Math.round(frac * BUSINESS_DAY_MINUTES);
      }
    }
    return {
      key,
      label,
      revenue,
      units: probableUnits * factor,
      salesCount: probableSales * factor,
      grossProfit: gross,
      netProfit: net,
      breakEvenMinute,
    };
  }

  const scenarios = [
    scenario('conservative', 'Conservador', 0.9),
    scenario('probable', 'Probable', 1),
    scenario('optimistic', 'Optimista', 1.12),
  ];

  return {
    scenarios,
    confidence,
    method,
    breakEvenMinuteEstimate: scenarios[1].breakEvenMinute,
    historicalShareAtNow: histShare,
  };
}

export function estimateBreakEvenLabel(minute: number | null): string {
  if (minute == null) return 'Sin estimar';
  return businessMinuteLabel(minute);
}

export function movingAverage(values: number[], window = 3): number[] {
  return values.map((_, i) => {
    const from = Math.max(0, i - window + 1);
    const slice = values.slice(from, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function velocityTrend(
  recent: number[],
): 'Acelerando' | 'Estable' | 'Desacelerando' {
  if (recent.length < 3) return 'Estable';
  const a = recent[recent.length - 3];
  const b = recent[recent.length - 2];
  const c = recent[recent.length - 1];
  const d1 = b - a;
  const d2 = c - b;
  if (d2 > d1 && c > b) return 'Acelerando';
  if (d2 < d1 && c < b) return 'Desacelerando';
  return 'Estable';
}

/** Minute where cumulative gross crosses rent, from raw cumulative series */
export function breakEvenFromBuckets(buckets: IntervalBucket[]): number | null {
  for (const b of buckets) {
    if (b.cumulativeGross >= RENT_AMOUNT) {
      const prev = b.cumulativeGross - b.grossProfit;
      if (b.grossProfit <= 0) return b.startMinute;
      const frac = (RENT_AMOUNT - prev) / b.grossProfit;
      return Math.round(b.startMinute + frac * (b.endMinute - b.startMinute));
    }
  }
  return null;
}
