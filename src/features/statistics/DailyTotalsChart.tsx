import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Spinner } from 'reactstrap';
import { api } from '../../api/api';
import { CHART_COLORS, tooltipStyle } from './analytics/chartColors';
import { formatIsoDayLabel } from '../shared/dates';
import { formatMoney } from '../shared/money';

function shortDayLabel(isoDay: string): string {
  // dd/MM
  const [y, m, d] = isoDay.split('-');
  if (!y || !m || !d) return isoDay;
  return `${d}/${m}`;
}

function formatAxisAmount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

export function DailyTotalsChart() {
  const query = useQuery({
    queryKey: ['stats-daily-totals'],
    queryFn: () => api.statistics.dailyTotals(),
  });

  const data = useMemo(
    () =>
      (query.data?.days ?? []).map((d) => ({
        day: d.day,
        label: shortDayLabel(d.day),
        amount: Number(d.amount),
      })),
    [query.data],
  );

  if (query.isLoading) {
    return (
      <div className="stats-chart-wrap text-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!data.length) return null;

  return (
    <div className="stats-chart-wrap">
      <h2 className="stats-chart-title">Montos por día</h2>
      <div className="stats-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
              axisLine={{ stroke: CHART_COLORS.axisLine }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatAxisAmount}
              tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ fill: CHART_COLORS.currentSoft }}
              contentStyle={tooltipStyle}
              labelFormatter={(_, payload) => {
                const day = payload?.[0]?.payload?.day as string | undefined;
                return day ? formatIsoDayLabel(day) : '';
              }}
              formatter={(value: number) => [formatMoney(value), 'Monto']}
            />
            <Bar dataKey="amount" fill={CHART_COLORS.current} radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
