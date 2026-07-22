/**
 * Paleta semántica estable para todos los gráficos de Estadísticas.
 * No asignar colores aleatorios en cada render.
 */
export const CHART_COLORS = {
  current: '#e11d48',
  currentSoft: 'rgba(225, 29, 72, 0.35)',
  comparable: '#38bdf8',
  comparableSoft: 'rgba(56, 189, 248, 0.28)',
  average: '#a8a29e',
  averageSoft: 'rgba(168, 162, 158, 0.3)',
  projection: '#f59e0b',
  projectionSoft: 'rgba(245, 158, 11, 0.25)',
  breakEven: '#fbbf24',
  positive: '#34d399',
  negative: '#fb7185',
  accent2: '#fb7185',
  grid: 'rgba(242, 239, 232, 0.08)',
  axis: 'rgba(242, 239, 232, 0.58)',
  axisLine: 'rgba(242, 239, 232, 0.12)',
  tooltipBg: '#1a1a1f',
  tooltipBorder: 'rgba(242, 239, 232, 0.12)',
  ink: '#f2efe8',
  /** Categorías (artículos / motivos) — ciclo fijo */
  series: [
    '#e11d48',
    '#38bdf8',
    '#34d399',
    '#f59e0b',
    '#a78bfa',
    '#fb7185',
    '#2dd4bf',
    '#f472b6',
    '#94a3b8',
    '#facc15',
  ],
} as const;

export function seriesColor(index: number): string {
  return CHART_COLORS.series[index % CHART_COLORS.series.length];
}

export const tooltipStyle = {
  background: CHART_COLORS.tooltipBg,
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: 10,
  color: CHART_COLORS.ink,
} as const;
