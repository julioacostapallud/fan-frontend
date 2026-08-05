import type { ThemeMode } from '../../shared/ThemeContext';

/**
 * Paleta ejecutiva calmada — integrada a la UI (no widget).
 */
const LIGHT = {
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

const DARK = {
  real: '#7EB8C4',
  realFill: 'rgba(126, 184, 196, 0.22)',
  projected: '#5A7A84',
  projectedMuted: 'rgba(90, 122, 132, 0.45)',
  netPositive: '#4DB896',
  netNegative: '#E07A86',
  breakEven: '#C4A06A',
  breakEvenSoft: 'rgba(196, 160, 106, 0.22)',
  today: '#D46A7C',
  todaySoft: 'rgba(212, 106, 124, 0.28)',
  future: '#6B737C',
  conservative: '#8A929A',
  probable: '#7EB8C4',
  optimistic: '#4DB896',
  grid: 'rgba(255, 255, 255, 0.06)',
  axis: 'rgba(168, 176, 184, 0.9)',
  axisLine: 'rgba(255, 255, 255, 0.08)',
  ink: '#E8ECF0',
  muted: 'rgba(168, 176, 184, 0.9)',
  tooltipBg: '#1A1F24',
  tooltipBorder: 'rgba(255, 255, 255, 0.1)',
  product: '#8AADB6',
  motif: '#B8909E',
} as const;

export type GeneralChartTheme = {
  real: string;
  realFill: string;
  projected: string;
  projectedMuted: string;
  netPositive: string;
  netNegative: string;
  breakEven: string;
  breakEvenSoft: string;
  today: string;
  todaySoft: string;
  future: string;
  conservative: string;
  probable: string;
  optimistic: string;
  grid: string;
  axis: string;
  axisLine: string;
  ink: string;
  muted: string;
  tooltipBg: string;
  tooltipBorder: string;
  product: string;
  motif: string;
};

/** @deprecated Prefer chartThemeFor(theme) */
export const GENERAL_CHART: GeneralChartTheme = LIGHT;

export function chartThemeFor(theme: ThemeMode): GeneralChartTheme {
  return theme === 'dark' ? DARK : LIGHT;
}

export function generalTooltipStyle(theme: ThemeMode) {
  const c = chartThemeFor(theme);
  return {
    background: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    borderRadius: 20,
    color: c.ink,
    fontSize: 13,
    boxShadow:
      theme === 'dark'
        ? '0 12px 40px rgba(0, 0, 0, 0.45)'
        : '0 12px 40px rgba(26, 31, 36, 0.08)',
  } as const;
}
