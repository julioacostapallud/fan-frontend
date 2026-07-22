import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Spinner } from 'reactstrap';
import { api } from '../../api/api';
import { formatSaleDateTime } from '../shared/dates';
import { formatMoney } from '../shared/money';

function formatAxisAmount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

function shortDateTime(iso: string): string {
  // dd/MM HH:mm — compact for mobile axis
  const label = formatSaleDateTime(iso);
  return label.replace(' · ', ' ');
}

export function RevenueProgressChart() {
  const query = useQuery({
    queryKey: ['stats-revenue-progress'],
    queryFn: () => api.statistics.revenueProgress(),
  });

  const data = useMemo(
    () =>
      (query.data?.points ?? []).map((p, index) => ({
        index,
        at: p.at,
        label: shortDateTime(p.at),
        amount: Number(p.amount),
        cumulative: Number(p.cumulative),
      })),
    [query.data],
  );

  const tickInterval = useMemo(() => {
    if (data.length <= 6) return 0;
    return Math.max(1, Math.ceil(data.length / 5) - 1);
  }, [data.length]);

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
      <h2 className="stats-chart-title">Avance de recaudación</h2>
      <div className="stats-chart stats-chart-tall">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 28 }}>
            <CartesianGrid stroke="rgba(242, 239, 232, 0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(242, 239, 232, 0.58)', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(242, 239, 232, 0.12)' }}
              tickLine={false}
              interval={tickInterval}
              angle={-32}
              textAnchor="end"
              height={48}
            />
            <YAxis
              domain={[0, 'auto']}
              tickFormatter={formatAxisAmount}
              tick={{ fill: 'rgba(242, 239, 232, 0.58)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: '#1a1a1f',
                border: '1px solid rgba(242, 239, 232, 0.12)',
                borderRadius: 10,
                color: '#f2efe8',
              }}
              labelFormatter={(_, payload) => {
                const at = payload?.[0]?.payload?.at as string | undefined;
                return at ? formatSaleDateTime(at) : '';
              }}
              formatter={(value: number, name: string) => {
                if (name === 'cumulative') return [formatMoney(value), 'Acumulado'];
                return [formatMoney(value), 'Venta'];
              }}
            />
            <Line
              type="stepAfter"
              dataKey="cumulative"
              stroke="#fb7185"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#e11d48' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
