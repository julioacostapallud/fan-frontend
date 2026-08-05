/**
 * Paleta ejecutiva calmada — integrada a la UI (no widget).
 */
export const GENERAL_CHART = {
  real: '#3D7A8A',
  realFill: 'rgba(61, 122, 138, 0.22)',
  projected: '#8AADB6',
  projectedMuted: 'rgba(138, 173, 182, 0.45)',
  netPositive: '#2A9B7A',
  netNegative: '#C44B5A',
  breakEven: '#A67C52',
  breakEvenSoft: 'rgba(166, 124, 82, 0.2)',
  today: '#B83A52',
  todaySoft: 'rgba(184, 58, 82, 0.28)',
  future: '#A8B0B8',
  conservative: '#9AA3AB',
  probable: '#3D7A8A',
  optimistic: '#2A9B7A',
  grid: 'rgba(26, 31, 36, 0.06)',
  axis: 'rgba(92, 102, 112, 0.85)',
  axisLine: 'rgba(26, 31, 36, 0.08)',
  ink: '#1A1F24',
  muted: 'rgba(92, 102, 112, 0.9)',
  tooltipBg: '#FFFFFF',
  tooltipBorder: 'rgba(26, 31, 36, 0.08)',
  product: '#5C7A8A',
  motif: '#8A6B7A',
} as const;

export const generalTooltipStyle = {
  background: GENERAL_CHART.tooltipBg,
  border: `1px solid ${GENERAL_CHART.tooltipBorder}`,
  borderRadius: 20,
  color: GENERAL_CHART.ink,
  fontSize: 13,
  boxShadow: '0 12px 40px rgba(26, 31, 36, 0.08)',
} as const;
