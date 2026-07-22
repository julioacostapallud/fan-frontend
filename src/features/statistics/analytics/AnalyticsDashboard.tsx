import { Fragment, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button, Input, Label, Spinner } from 'reactstrap';
import { formatMoney } from '../../shared/money';
import { formatIsoDayLabel, todayIsoDate } from '../../shared/dates';
import { buildDashboard, metricValue } from './buildDashboard';
import { businessMinuteLabel } from './businessDay';
import { CHART_COLORS, seriesColor, tooltipStyle } from './chartColors';
import { listBusinessDays } from './compare';
import { breakEvenFromBuckets } from './projection';
import { RENT_AMOUNT, breakEvenRevenue } from './economics';
import { csvFilenameForDay, exportAnalyticsCsv } from './exportCsv';
import { useAnalyticsSales } from './useAnalyticsSales';
import type {
  AnalyticsFilters,
  ComparisonMode,
  IntervalMinutes,
  MetricKey,
  ProductSortKey,
} from './types';

const defaultFilters = (): AnalyticsFilters => ({
  day: todayIsoDate(),
  motifName: null,
  productId: null,
  interval: 60,
  metric: 'revenue',
  comparison: 'previousDay',
  customCompareDay: null,
  compareFullHistorical: false,
  heatmapMode: 'byDate',
  productSort: 'revenue',
  intervalMetric: 'revenue',
});

function formatAxis(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}k`;
  return String(Math.round(v));
}

export function AnalyticsDashboard() {
  const { sales, isLoading, error, refetch } = useAnalyticsSales();
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters);
  const [tableQ, setTableQ] = useState('');
  const [tablePage, setTablePage] = useState(0);
  const pageSize = 12;

  const days = useMemo(() => listBusinessDays(sales), [sales]);

  const model = useMemo(() => {
    if (!sales.length) return null;
    const day = days.includes(filters.day) ? filters.day : days[days.length - 1] ?? filters.day;
    return buildDashboard(sales, { ...filters, day });
  }, [sales, filters, days]);

  const motifs = useMemo(() => {
    const set = new Set<string>();
    for (const s of sales) for (const i of s.items) set.add(i.motifName);
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [sales]);

  const products = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sales) for (const i of s.items) map.set(i.productId, i.productName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }, [sales]);

  const patch = (p: Partial<AnalyticsFilters>) => {
    setFilters((f) => ({ ...f, ...p }));
    setTablePage(0);
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-banner">
        No se pudieron cargar las ventas.{' '}
        <button type="button" className="btn btn-link p-0" onClick={() => refetch()}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!model) {
    return <p className="text-muted">Todavía no hay ventas para analizar.</p>;
  }

  const beMinute = breakEvenFromBuckets(model.primaryBuckets);
  const beRevenue = breakEvenRevenue();

  const cumulativeData = model.primaryBuckets.map((b, i) => {
    const cmp = model.compareBuckets?.[i];
    return {
      label: businessMinuteLabel(b.startMinute),
      current: metricValue(b, filters.metric, true),
      compare: cmp ? metricValue(cmp, filters.metric, true) : null,
      revenue: b.cumulativeRevenue,
      sales: b.cumulativeSales,
      units: b.cumulativeUnits,
      gross: b.cumulativeGross,
      rentLeft: b.rentRemaining,
      net: b.cumulativeNet,
      projection:
        i === model.primaryBuckets.length - 1
          ? model.projection.scenarios[1].revenue
          : null,
    };
  });

  // Projection dashed continuation: append synthetic end point for display
  const projEnd = {
    label: '06:00',
    current: null as number | null,
    compare: null as number | null,
    revenue: model.projection.scenarios[1].revenue,
    sales: 0,
    units: 0,
    gross: 0,
    rentLeft: 0,
    net: model.projection.scenarios[1].netProfit,
    projection: model.projection.scenarios[1].revenue,
  };

  const intervalData = model.primaryBuckets.map((b, i) => {
    const cmp = model.compareBuckets?.[i];
    return {
      label: businessMinuteLabel(b.startMinute),
      current: metricValue(b, filters.intervalMetric, false),
      compare: cmp ? metricValue(cmp, filters.intervalMetric, false) : null,
      sales: b.salesCount,
      units: b.units,
      revenue: b.revenue,
      gross: b.grossProfit,
      share: model.kpis.revenue ? (b.revenue / model.kpis.revenue) * 100 : 0,
    };
  });

  const breakEvenSeries = model.primaryBuckets.map((b) => ({
    label: businessMinuteLabel(b.startMinute),
    gross: b.cumulativeGross,
    net: Math.max(0, b.cumulativeNet),
    rent: RENT_AMOUNT,
  }));

  const velocityData = model.velocity.labels.map((label, i) => ({
    label,
    value: model.velocity.values[i],
    ma: model.velocity.movingAvg[i],
  }));

  const filteredTable = model.tableRows.filter((r) =>
    !tableQ || r.interval.toLowerCase().includes(tableQ.toLowerCase()),
  );
  const pageRows = filteredTable.slice(tablePage * pageSize, (tablePage + 1) * pageSize);
  const pages = Math.max(1, Math.ceil(filteredTable.length / pageSize));

  const k = model.kpis;

  return (
    <div className="analytics">
      <div className="analytics-filters">
        <div className="af-field">
          <Label>Día comercial</Label>
          <Input
            type="select"
            value={filters.day}
            onChange={(e) => patch({ day: e.target.value })}
          >
            {days.map((d) => (
              <option key={d} value={d}>
                {formatIsoDayLabel(d)}
              </option>
            ))}
          </Input>
        </div>
        <div className="af-field">
          <Label>Desde</Label>
          <Input
            type="select"
            value={filters.rangeFrom ?? ''}
            onChange={(e) => patch({ rangeFrom: e.target.value || undefined })}
          >
            <option value="">—</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {formatIsoDayLabel(d)}
              </option>
            ))}
          </Input>
        </div>
        <div className="af-field">
          <Label>Hasta</Label>
          <Input
            type="select"
            value={filters.rangeTo ?? ''}
            onChange={(e) => patch({ rangeTo: e.target.value || undefined })}
          >
            <option value="">—</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {formatIsoDayLabel(d)}
              </option>
            ))}
          </Input>
        </div>
        <div className="af-field">
          <Label>Motivo</Label>
          <Input
            type="select"
            value={filters.motifName ?? ''}
            onChange={(e) => patch({ motifName: e.target.value || null })}
          >
            <option value="">Todos</option>
            {motifs.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Input>
        </div>
        <div className="af-field">
          <Label>Artículo</Label>
          <Input
            type="select"
            value={filters.productId ?? ''}
            onChange={(e) => patch({ productId: e.target.value || null })}
          >
            <option value="">Todos</option>
            {products.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Input>
        </div>
        <div className="af-field">
          <Label>Intervalo</Label>
          <Input
            type="select"
            value={filters.interval}
            onChange={(e) => patch({ interval: Number(e.target.value) as IntervalMinutes })}
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>1 hora</option>
          </Input>
        </div>
        <div className="af-field">
          <Label>Métrica</Label>
          <Input
            type="select"
            value={filters.metric}
            onChange={(e) => patch({ metric: e.target.value as MetricKey })}
          >
            <option value="salesCount">Cant. ventas</option>
            <option value="units">Cant. artículos</option>
            <option value="revenue">Monto facturado</option>
            <option value="grossProfit">Ganancia bruta</option>
            <option value="netProfit">Ganancia neta</option>
          </Input>
        </div>
        <div className="af-field">
          <Label>Comparación</Label>
          <Input
            type="select"
            value={filters.comparison}
            onChange={(e) => patch({ comparison: e.target.value as ComparisonMode })}
          >
            <option value="none">Sin comparación</option>
            <option value="previousDay">Día anterior</option>
            <option value="sameWeekdayPrev">Mismo día semana ant.</option>
            <option value="avgLast4Equivalent">Prom. 4 días equiv.</option>
            <option value="avgLast8Equivalent">Prom. 8 días equiv.</option>
            <option value="customDay">Otro día…</option>
          </Input>
        </div>
        {filters.comparison === 'customDay' && (
          <div className="af-field">
            <Label>Día comparable</Label>
            <Input
              type="select"
              value={filters.customCompareDay ?? ''}
              onChange={(e) => patch({ customCompareDay: e.target.value || null })}
            >
              <option value="">Elegir…</option>
              {days
                .filter((d) => d !== filters.day)
                .map((d) => (
                  <option key={d} value={d}>
                    {formatIsoDayLabel(d)}
                  </option>
                ))}
            </Input>
          </div>
        )}
        <label className="af-check">
          <input
            type="checkbox"
            checked={filters.compareFullHistorical}
            onChange={(e) => patch({ compareFullHistorical: e.target.checked })}
          />
          Comparar vs cierre histórico completo
        </label>
      </div>

      <div className="analytics-kpis">
        <Kpi label="Facturado" value={formatMoney(k.revenue)} />
        <Kpi label="Ventas" value={String(k.salesCount)} />
        <Kpi label="Artículos" value={String(k.units)} />
        <Kpi label="Ticket prom." value={formatMoney(k.avgTicket)} />
        <Kpi label="Ganancia bruta" value={formatMoney(k.gross)} tone="pos" />
        <Kpi label="Alquiler" value={formatMoney(k.rent)} />
        <Kpi
          label="Ganancia neta"
          value={formatMoney(k.net)}
          tone={k.net >= 0 ? 'pos' : 'neg'}
        />
        <Kpi label="% alquiler cubierto" value={`${k.coveragePct.toFixed(1)}%`} />
        <div className={`kpi-card kpi-wide ${k.covered ? 'kpi-pos' : 'kpi-warn'}`}>
          <div className="kpi-label">Punto de equilibrio</div>
          <div className="kpi-value">{formatMoney(k.breakEvenTarget)}</div>
          <div className="kpi-sub">
            Facturado {formatMoney(k.revenue)} ·{' '}
            {k.covered
              ? `✓ Alquiler cubierto · neto ${formatMoney(k.net)}`
              : `Falta facturar ${formatMoney(k.revenueNeeded)} (${(100 - k.coveragePct).toFixed(1)}%)`}
          </div>
        </div>
        <Kpi label="Hora pico" value={k.peakHourLabel} />
        <Kpi label="Proy. cierre" value={formatMoney(k.projectionRevenue)} tone="proj" />
        <Kpi
          label="Proy. neto"
          value={formatMoney(k.projectionNet)}
          tone={k.projectionNet >= 0 ? 'pos' : 'neg'}
        />
      </div>

      {/* Chart 1 */}
      <section className="stats-chart-wrap">
        <h2 className="stats-chart-title">1 · Ventas acumuladas (día comercial 06→06)</h2>
        <div className="stats-chart stats-chart-tall">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[...cumulativeData, projEnd]} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[0, 'auto']} tickFormatter={formatAxis} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} width={42} />
              {(filters.metric === 'revenue' || filters.metric === 'grossProfit') && (
                <ReferenceLine
                  y={filters.metric === 'revenue' ? beRevenue : RENT_AMOUNT}
                  stroke={CHART_COLORS.breakEven}
                  strokeDasharray="4 4"
                  label={{ value: 'Equilibrio', fill: CHART_COLORS.breakEven, fontSize: 10 }}
                />
              )}
              {beMinute != null && (
                <ReferenceLine
                  x={businessMinuteLabel(Math.floor(beMinute / filters.interval) * filters.interval)}
                  stroke={CHART_COLORS.breakEven}
                />
              )}
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [formatMoney(value), name]}
                labelFormatter={(l) => `Hora ${l}`}
              />
              <Legend />
              <Line type="monotone" dataKey="current" name="Actual" stroke={CHART_COLORS.current} strokeWidth={2.5} dot={false} connectNulls={false} />
              {model.compareBuckets && (
                <Line
                  type="monotone"
                  dataKey="compare"
                  name={model.compareIsAverage ? 'Promedio' : 'Comparable'}
                  stroke={model.compareIsAverage ? CHART_COLORS.average : CHART_COLORS.comparable}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              )}
              <Line
                type="monotone"
                dataKey="projection"
                name="Proyección"
                stroke={CHART_COLORS.projection}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Chart 2 */}
      <section className="stats-chart-wrap">
        <h2 className="stats-chart-title">2 · Avance al punto de equilibrio</h2>
        <div className="be-progress">
          <div className="be-bar">
            <div
              className="be-bar-fill"
              style={{ width: `${Math.min(100, k.coveragePct)}%` }}
            />
          </div>
          <div className="be-meta">
            <span>{k.coveragePct.toFixed(1)}% cubierto</span>
            <span>{formatMoney(Math.min(k.gross, RENT_AMOUNT))} / {formatMoney(RENT_AMOUNT)}</span>
            {k.covered ? (
              <span>
                Cubierto ≈ {beMinute != null ? businessMinuteLabel(beMinute) : '—'} · neto{' '}
                {formatMoney(k.net)}
              </span>
            ) : (
              <span>
                Pendiente {formatMoney(Math.max(0, RENT_AMOUNT - k.gross))} · falta facturar{' '}
                {formatMoney(k.revenueNeeded)} · eq. est.{' '}
                {model.projection.breakEvenMinuteEstimate != null
                  ? businessMinuteLabel(model.projection.breakEvenMinuteEstimate)
                  : '—'}
              </span>
            )}
          </div>
        </div>
        <div className="stats-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={breakEvenSeries}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tickFormatter={formatAxis} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} width={42} />
              <ReferenceLine y={RENT_AMOUNT} stroke={CHART_COLORS.breakEven} strokeDasharray="4 4" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatMoney(v)} />
              <Legend />
              <Line type="monotone" dataKey="gross" name="Ganancia bruta" stroke={CHART_COLORS.current} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="net" name="Neto (post-alquiler)" stroke={CHART_COLORS.positive} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Chart 3 */}
      <section className="stats-chart-wrap">
        <div className="chart-head-row">
          <h2 className="stats-chart-title mb-0">3 · Ventas por intervalo</h2>
          <Input
            bsSize="sm"
            type="select"
            className="chart-metric-select"
            value={filters.intervalMetric}
            onChange={(e) =>
              patch({
                intervalMetric: e.target.value as AnalyticsFilters['intervalMetric'],
              })
            }
          >
            <option value="revenue">Facturación</option>
            <option value="salesCount">Ventas</option>
            <option value="units">Artículos</option>
            <option value="grossProfit">Ganancia bruta</option>
          </Input>
        </div>
        <div className="stats-chart stats-chart-tall">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={intervalData}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tickFormatter={formatAxis} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} width={42} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name: string) => {
                  if (name === 'current') return [formatAxis(v), 'Actual'];
                  if (name === 'compare')
                    return [formatAxis(v), model.compareIsAverage ? 'Promedio' : 'Comparable'];
                  return [v, name];
                }}
                labelFormatter={(l, payload) => {
                  const p = payload?.[0]?.payload;
                  return `${l} · ${p?.share?.toFixed?.(1) ?? 0}% del día`;
                }}
              />
              <Legend />
              <Bar dataKey="current" name="Actual" fill={CHART_COLORS.current} radius={[4, 4, 0, 0]} maxBarSize={28} />
              {model.compareBuckets && (
                <Bar
                  dataKey="compare"
                  name={model.compareIsAverage ? 'Promedio' : 'Comparable'}
                  fill={model.compareIsAverage ? CHART_COLORS.average : CHART_COLORS.comparable}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Chart 4 */}
      <section className="stats-chart-wrap">
        <h2 className="stats-chart-title">4 · Velocidad de venta</h2>
        <div className="velocity-meta">
          <span>Actual: {formatAxis(model.velocity.current)}</span>
          <span>Promedio: {formatAxis(model.velocity.dayAvg)}</span>
          <span>
            Máx: {formatAxis(model.velocity.max)} ({model.velocity.maxLabel})
          </span>
          <span className="vel-trend">{model.velocity.trend}</span>
        </div>
        <div className="stats-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={velocityData}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tickFormatter={formatAxis} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} width={42} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="value" name="Velocidad" stroke={CHART_COLORS.current} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ma" name="Media móvil 3" stroke={CHART_COLORS.average} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Chart 5 heatmap */}
      <section className="stats-chart-wrap">
        <div className="chart-head-row">
          <h2 className="stats-chart-title mb-0">5 · Mapa de calor</h2>
          <Input
            bsSize="sm"
            type="select"
            className="chart-metric-select"
            value={filters.heatmapMode}
            onChange={(e) =>
              patch({ heatmapMode: e.target.value as 'byDate' | 'byWeekday' })
            }
          >
            <option value="byDate">Por fecha comercial</option>
            <option value="byWeekday">Promedio por día semana</option>
          </Input>
        </div>
        <div className="heatmap">
          <div
            className="heatmap-grid"
            style={{
              gridTemplateColumns: `minmax(4.5rem, auto) repeat(${model.heatmap.cols.length}, minmax(10px, 1fr))`,
            }}
          >
            <div />
            {model.heatmap.cols.map((c, i) =>
              i % 2 === 0 ? (
                <div key={c} className="heatmap-col">
                  {c.slice(0, 2)}
                </div>
              ) : (
                <div key={c} />
              ),
            )}
            {model.heatmap.rows.map((row, ri) => (
              <Fragment key={row}>
                <div className="heatmap-row">
                  {filters.heatmapMode === 'byDate' ? formatIsoDayLabel(row).slice(0, 5) : row}
                </div>
                {model.heatmap.values[ri].map((v, ci) => {
                  const intensity = v / model.heatmap.max;
                  return (
                    <div
                      key={`${row}-${ci}`}
                      className="heatmap-cell"
                      title={`${row} ${model.heatmap.cols[ci]}: ${formatAxis(v)}`}
                      style={{
                        background: `rgba(225, 29, 72, ${0.08 + intensity * 0.85})`,
                      }}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Chart 6 projection */}
      <section className="stats-chart-wrap">
        <h2 className="stats-chart-title">6 · Proyección de cierre</h2>
        <p className="proj-method">
          Confianza <strong>{model.projection.confidence}</strong> · {model.projection.method}
        </p>
        <div className="proj-cards">
          {model.projection.scenarios.map((s) => (
            <div key={s.key} className="proj-card">
              <div className="proj-label">{s.label}</div>
              <div className="proj-value">{formatMoney(s.revenue)}</div>
              <div className="proj-sub">
                Bruta {formatMoney(s.grossProfit)} · Neta {formatMoney(s.netProfit)}
              </div>
              <div className="proj-sub">
                Equilibrio{' '}
                {s.breakEvenMinute != null ? businessMinuteLabel(s.breakEvenMinute) : '—'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chart 7 products */}
      <section className="stats-chart-wrap">
        <div className="chart-head-row">
          <h2 className="stats-chart-title mb-0">7 · Artículos</h2>
          <Input
            bsSize="sm"
            type="select"
            className="chart-metric-select"
            value={filters.productSort}
            onChange={(e) => patch({ productSort: e.target.value as ProductSortKey })}
          >
            <option value="revenue">Facturación</option>
            <option value="units">Cantidad</option>
            <option value="grossProfit">Ganancia bruta</option>
            <option value="share">Participación</option>
            <option value="growth">Crecimiento</option>
          </Input>
        </div>
        <div className="stats-chart stats-chart-tall">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={model.products.slice(0, 10)}
              margin={{ left: 8, right: 12 }}
            >
              <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
              <XAxis type="number" tickFormatter={formatAxis} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={88} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(_v: number, _n, item) => {
                  const p = item.payload;
                  return [
                    `${formatMoney(p.revenue)} · ${p.units} u. · ${p.share.toFixed(1)}%${p.growth != null ? ` · Δ ${p.growth.toFixed(0)}%` : ''}`,
                    'Detalle',
                  ];
                }}
              />
              <Bar
                dataKey={filters.productSort === 'units' ? 'units' : filters.productSort === 'grossProfit' ? 'grossProfit' : filters.productSort === 'share' ? 'share' : filters.productSort === 'growth' ? 'growth' : 'revenue'}
                name="Valor"
                radius={[0, 4, 4, 0]}
                onClick={(d) => patch({ productId: d.id })}
              >
                {model.products.slice(0, 10).map((_, i) => (
                  <Cell key={i} fill={seriesColor(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {filters.productId && (
          <Button size="sm" color="link" onClick={() => patch({ productId: null })}>
            Quitar filtro artículo
          </Button>
        )}
      </section>

      {/* Chart 8 motifs */}
      <section className="stats-chart-wrap">
        <h2 className="stats-chart-title">8 · Motivos</h2>
        <div className="stats-chart stats-chart-tall">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={model.motifs.slice(0, 12)} margin={{ left: 8, right: 12 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
              <XAxis type="number" tickFormatter={formatAxis} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="revenue" name="Facturación" radius={[0, 4, 4, 0]} onClick={(d) => patch({ motifName: d.name })}>
                {model.motifs.slice(0, 12).map((_, i) => (
                  <Cell key={i} fill={seriesColor(i + 3)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {filters.motifName && (
          <Button size="sm" color="link" onClick={() => patch({ motifName: null })}>
            Quitar filtro motivo
          </Button>
        )}
      </section>

      {/* Table */}
      <section className="stats-chart-wrap">
        <div className="chart-head-row">
          <h2 className="stats-chart-title mb-0">Detalle por intervalo</h2>
          <div className="table-actions">
            <Input
              bsSize="sm"
              placeholder="Buscar…"
              value={tableQ}
              onChange={(e) => {
                setTableQ(e.target.value);
                setTablePage(0);
              }}
            />
            <Button
              size="sm"
              className="btn-secondary-fan"
              onClick={() =>
                exportAnalyticsCsv(
                  filteredTable.map((r) => ({
                    dia_comercial: r.businessDay,
                    intervalo: r.interval,
                    ventas: r.salesCount,
                    articulos: r.units,
                    facturacion: Math.round(r.revenue),
                    ganancia_bruta: Math.round(r.gross),
                    alquiler_pendiente: Math.round(r.rentRemaining),
                    ganancia_neta: Math.round(r.net),
                    acum_facturado: Math.round(r.cumRevenue),
                    acum_bruta: Math.round(r.cumGross),
                    comparable: r.compare != null ? Math.round(r.compare) : '',
                    diff_abs: r.diffAbs != null ? Math.round(r.diffAbs) : '',
                    diff_pct: r.diffPct != null ? r.diffPct.toFixed(1) : '',
                  })),
                  csvFilenameForDay(filters.day),
                )
              }
            >
              CSV
            </Button>
          </div>
        </div>
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Intervalo</th>
                <th>Ventas</th>
                <th>Art.</th>
                <th>Fact.</th>
                <th>Bruta</th>
                <th>Pend.</th>
                <th>Neta</th>
                <th>Acum.</th>
                <th>Comp.</th>
                <th>Δ%</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.interval}>
                  <td>{r.interval}</td>
                  <td>{r.salesCount}</td>
                  <td>{r.units}</td>
                  <td>{formatMoney(r.revenue)}</td>
                  <td>{formatMoney(r.gross)}</td>
                  <td>{formatMoney(r.rentRemaining)}</td>
                  <td className={r.net >= 0 ? 'pos' : 'neg'}>{formatMoney(r.net)}</td>
                  <td>{formatMoney(r.cumRevenue)}</td>
                  <td>{r.compare != null ? formatAxis(r.compare) : '—'}</td>
                  <td>{r.diffPct != null ? `${r.diffPct.toFixed(0)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-pager">
          <Button
            size="sm"
            disabled={tablePage <= 0}
            onClick={() => setTablePage((p) => p - 1)}
          >
            ←
          </Button>
          <span>
            {tablePage + 1} / {pages}
          </span>
          <Button
            size="sm"
            disabled={tablePage >= pages - 1}
            onClick={() => setTablePage((p) => p + 1)}
          >
            →
          </Button>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'pos' | 'neg' | 'proj';
}) {
  return (
    <div className={`kpi-card ${tone ? `kpi-${tone}` : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}
