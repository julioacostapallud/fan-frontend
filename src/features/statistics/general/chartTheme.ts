/**
 * Paleta ejecutiva estable para la solapa General.
 * No generar colores aleatorios en cada render.
 */
export const GENERAL_CHART = {
  real: '#38bdf8',
  realFill: 'rgba(56, 189, 248, 0.35)',
  projected: '#7dd3fc',
  projectedMuted: 'rgba(125, 211, 252, 0.55)',
  netPositive: '#34d399',
  netNegative: '#fb7185',
  breakEven: '#f59e0b',
  breakEvenSoft: 'rgba(245, 158, 11, 0.25)',
  today: '#e11d48',
  todaySoft: 'rgba(225, 29, 72, 0.4)',
  future: '#64748b',
  conservative: '#94a3b8',
  probable: '#38bdf8',
  optimistic: '#34d399',
  grid: 'rgba(242, 239, 232, 0.1)',
  axis: 'rgba(242, 239, 232, 0.65)',
  axisLine: 'rgba(242, 239, 232, 0.14)',
  ink: '#f2efe8',
  muted: 'rgba(242, 239, 232, 0.58)',
  tooltipBg: '#1a1a1f',
  tooltipBorder: 'rgba(242, 239, 232, 0.14)',
  product: '#a78bfa',
  motif: '#f472b6',
} as const;

export const generalTooltipStyle = {
  background: GENERAL_CHART.tooltipBg,
  border: `1px solid ${GENERAL_CHART.tooltipBorder}`,
  borderRadius: 12,
  color: GENERAL_CHART.ink,
  fontSize: 13,
} as const;
