export type IntervalMinutes = 15 | 30 | 60;

export type MetricKey =
  | 'salesCount'
  | 'units'
  | 'revenue'
  | 'grossProfit'
  | 'netProfit';

export type ComparisonMode =
  | 'none'
  | 'previousDay'
  | 'sameWeekdayPrev'
  | 'avgLast4Equivalent'
  | 'avgLast8Equivalent'
  | 'customDay';

export type HeatmapMode = 'byDate' | 'byWeekday';

export type ProductSortKey =
  | 'units'
  | 'revenue'
  | 'grossProfit'
  | 'share'
  | 'growth';

export interface AnalyticsFilters {
  day: string; // yyyy-MM-dd día comercial principal
  rangeFrom?: string;
  rangeTo?: string;
  motifName: string | null;
  productId: string | null;
  interval: IntervalMinutes;
  metric: MetricKey;
  comparison: ComparisonMode;
  customCompareDay: string | null;
  /** Si true, compara el comparable completo aunque el día actual esté abierto */
  compareFullHistorical: boolean;
  heatmapMode: HeatmapMode;
  productSort: ProductSortKey;
  intervalMetric: 'revenue' | 'salesCount' | 'units' | 'grossProfit';
}

export interface AnalyticsLineItem {
  productId: string;
  productName: string;
  motifId: string;
  motifName: string;
  quantity: number;
  lineTotal: number;
}

export interface AnalyticsSale {
  id: string;
  createdAt: Date;
  businessDay: string;
  minutesIntoDay: number;
  total: number;
  units: number;
  items: AnalyticsLineItem[];
}

export interface IntervalBucket {
  index: number;
  startMinute: number;
  endMinute: number;
  label: string;
  salesCount: number;
  units: number;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  cumulativeRevenue: number;
  cumulativeUnits: number;
  cumulativeSales: number;
  cumulativeGross: number;
  cumulativeNet: number;
  rentRemaining: number;
}

export interface RankRow {
  id: string;
  name: string;
  units: number;
  revenue: number;
  grossProfit: number;
  share: number;
  growth: number | null;
}

export interface ProjectionScenario {
  key: 'conservative' | 'probable' | 'optimistic';
  label: string;
  revenue: number;
  units: number;
  salesCount: number;
  grossProfit: number;
  netProfit: number;
  breakEvenMinute: number | null;
}

export interface ProjectionResult {
  scenarios: ProjectionScenario[];
  confidence: 'alta' | 'media' | 'baja';
  method: string;
  breakEvenMinuteEstimate: number | null;
  historicalShareAtNow: number | null;
}
