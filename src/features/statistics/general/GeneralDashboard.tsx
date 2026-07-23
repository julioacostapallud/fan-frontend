import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Spinner } from 'reactstrap';
import { formatIsoDayLabel } from '../../shared/dates';
import { formatMoney } from '../../shared/money';
import { GENERAL_CHART, generalTooltipStyle } from './chartTheme';
import { BREAK_EVEN_REVENUE, RENT } from './eventModel';
import { useGeneralEventModel } from './useGeneralEventModel';

function axisMoney(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}k`;
  return String(Math.round(v));
}

function displayMotif(name: string): string {
  return name === '-' || name.trim() === '' ? 'Sin motivo' : name;
}

/** Recharts pasa el `name` de la serie (leyenda), no siempre el dataKey. */
function seriesTooltipLabel(
  name: string,
  item?: { dataKey?: string | number },
  projectedWord: 'Proyectada' | 'Proyectado' = 'Proyectada',
): string {
  const key = String(item?.dataKey ?? name);
  if (key === 'real' || name === 'Real') return 'Real';
  if (key === 'todayExtra' || name === 'Resto del día') return 'Proy. resto del día';
  if (key === 'projected' || name === 'Proyectada' || name === 'Proyectado') {
    return projectedWord;
  }
  return name;
}

export function GeneralDashboard() {
  const { model, isLoading, error, refetch } = useGeneralEventModel();
  const [driversTab, setDriversTab] = useState<'products' | 'motifs'>('products');

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="error-banner">
        No se pudo armar el dashboard.{' '}
        <button type="button" className="btn btn-link p-0" onClick={() => refetch()}>
          Reintentar
        </button>
      </div>
    );
  }

  const { kpis, days, hourly, scenarios, products, motifs } = model;
  const covered = kpis.gross >= RENT;

  const dayTicks = hourly.filter((h) => h.hourSlot === 0).map((h) => h.id);

  const cumData = hourly.map((h) => ({
    id: h.id,
    label: h.label,
    tickLabel: h.tickLabel,
    real: h.cumulativeReal,
    projected: h.cumulativeProjected,
  }));

  const netData = [
    {
      id: 'start',
      label: 'Inicio',
      tickLabel: '',
      real: -RENT,
      projected: -RENT,
    },
    ...hourly.map((h) => ({
      id: h.id,
      label: h.label,
      tickLabel: h.tickLabel,
      real: h.netReal,
      projected: h.netProjected,
    })),
  ];

  const dailyBars = days.map((d) => ({
    label: d.label,
    real: d.kind === 'past' ? d.revenue : d.kind === 'today' ? d.revenue : 0,
    todayExtra:
      d.kind === 'today' ? Math.max(0, d.projectedDayClose - d.revenue) : 0,
    projected: d.kind === 'future' ? d.projectedDayClose : 0,
    kind: d.kind,
  }));

  const probable = scenarios.find((s) => s.key === 'probable')!;
  const maxProductShare = Math.max(1, ...products.map((p) => p.share));
  const maxMotifShare = Math.max(1, ...motifs.map((m) => m.share));

  return (
    <div className="general-dash">
      <p className="general-lead">
        Evento 18/07 → 26/07 · Día comercial 06:00–06:00 · Margen 60% · Alquiler{' '}
        {formatMoney(RENT)}
      </p>

      <div className="general-kpis">
        <div className="g-kpi g-kpi-hero">
          <div className="g-kpi-title">Facturación actual</div>
          <div className="g-kpi-value">{formatMoney(kpis.revenue)}</div>
        </div>

        <div className="general-kpis-mid">
          <Kpi title="Ganancia bruta" value={formatMoney(kpis.gross)} tone="ok" />
          <Kpi
            title="Resultado neto"
            value={formatMoney(kpis.net)}
            tone={kpis.net >= 0 ? 'ok' : 'bad'}
          />
          <Kpi
            title="Proyección al cierre"
            value={formatMoney(kpis.projectedRevenue)}
            tone="sky"
          />
        </div>

        <div className="general-kpis-low">
          <Kpi title="Alquiler" value={formatMoney(kpis.rent)} />
          <Kpi title="% cubierto" value={`${kpis.coveragePct.toFixed(0)}%`} tone="warn" />
          <Kpi
            title="Neto proyectado"
            value={formatMoney(kpis.projectedNet)}
            tone={kpis.projectedNet >= 0 ? 'ok' : 'bad'}
          />
          <Kpi
            title="Equilibrio estimado"
            value={
              kpis.breakEvenDay
                ? `${formatIsoDayLabel(kpis.breakEvenDay)}${
                    kpis.breakEvenHourLabel ? ` · ${kpis.breakEvenHourLabel}` : ''
                  }`
                : 'Sin estimar'
            }
            tone="warn"
          />
        </div>
      </div>

      {/* 1 */}
      <section className="g-card">
        <header className="g-card-head">
          <h2>Facturación acumulada</h2>
          <p>Curva horaria · real hasta ahora y proyección con perfil del día</p>
        </header>
        <div className="g-chart g-chart-lg">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid stroke={GENERAL_CHART.grid} vertical={false} />
              <XAxis
                dataKey="id"
                ticks={dayTicks}
                tickFormatter={(id: string) =>
                  cumData.find((p) => p.id === id)?.tickLabel ?? ''
                }
                tick={{ fill: GENERAL_CHART.axis, fontSize: 11 }}
                interval={0}
                minTickGap={12}
              />
              <YAxis
                tickFormatter={axisMoney}
                tick={{ fill: GENERAL_CHART.axis, fontSize: 12 }}
                width={48}
              />
              <ReferenceLine
                y={BREAK_EVEN_REVENUE}
                stroke={GENERAL_CHART.breakEven}
                strokeDasharray="6 4"
                label={{
                  value: 'Equilibrio',
                  fill: GENERAL_CHART.breakEven,
                  fontSize: 12,
                  position: 'insideTopRight',
                }}
              />
              <Tooltip
                contentStyle={generalTooltipStyle}
                labelFormatter={(_, payload) =>
                  (payload?.[0]?.payload?.label as string) ?? ''
                }
                formatter={(v: number, name: string, item) => [
                  formatMoney(v),
                  seriesTooltipLabel(name, item, 'Proyectada'),
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
              <Line
                type="monotone"
                dataKey="real"
                name="Real"
                stroke={GENERAL_CHART.real}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="projected"
                name="Proyectada"
                stroke={GENERAL_CHART.projected}
                strokeWidth={2}
                strokeDasharray="8 5"
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 2 */}
      <section className="g-card">
        <header className="g-card-head">
          <h2>Resultado neto</h2>
          <p>Misma base horaria · cruza cero = alquiler cubierto</p>
        </header>
        <div className="g-chart g-chart-lg">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={netData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid stroke={GENERAL_CHART.grid} vertical={false} />
              <XAxis
                dataKey="id"
                ticks={['start', ...dayTicks]}
                tickFormatter={(id: string) =>
                  id === 'start'
                    ? ''
                    : netData.find((p) => p.id === id)?.tickLabel ?? ''
                }
                tick={{ fill: GENERAL_CHART.axis, fontSize: 11 }}
                interval={0}
                minTickGap={12}
              />
              <YAxis
                tickFormatter={axisMoney}
                tick={{ fill: GENERAL_CHART.axis, fontSize: 12 }}
                width={52}
              />
              <ReferenceLine y={0} stroke={GENERAL_CHART.breakEven} strokeWidth={2} />
              <Tooltip
                contentStyle={generalTooltipStyle}
                labelFormatter={(_, payload) =>
                  (payload?.[0]?.payload?.label as string) ?? ''
                }
                formatter={(v: number, name: string, item) => [
                  formatMoney(v),
                  seriesTooltipLabel(name, item, 'Proyectado'),
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
              <Line
                type="monotone"
                dataKey="real"
                name="Real"
                stroke={GENERAL_CHART.netPositive}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="projected"
                name="Proyectado"
                stroke={GENERAL_CHART.projected}
                strokeWidth={2}
                strokeDasharray="8 5"
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 3 */}
      <section className="g-card">
        <header className="g-card-head">
          <h2>Facturación por día comercial</h2>
          <p>Real · hoy (hecho + proyección) · futuros proyectados</p>
        </header>
        <div className="g-chart g-chart-md">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GENERAL_CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: GENERAL_CHART.axis, fontSize: 12 }} />
              <YAxis tickFormatter={axisMoney} tick={{ fill: GENERAL_CHART.axis, fontSize: 12 }} width={48} />
              <Tooltip
                contentStyle={generalTooltipStyle}
                formatter={(v: number, name: string) => {
                  const labels: Record<string, string> = {
                    real: 'Real',
                    todayExtra: 'Proy. resto del día',
                    projected: 'Proyectado',
                  };
                  return [formatMoney(v), labels[name] ?? name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
              <Bar dataKey="real" name="Real" stackId="a" fill={GENERAL_CHART.real} radius={[0, 0, 0, 0]} maxBarSize={40} />
              <Bar dataKey="todayExtra" name="Resto del día" stackId="a" fill={GENERAL_CHART.today} maxBarSize={40} />
              <Bar dataKey="projected" name="Proyectado" stackId="a" fill={GENERAL_CHART.future} radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 4 */}
      <section className="g-card">
        <header className="g-card-head">
          <h2>Punto de equilibrio</h2>
          <p>Cobertura del alquiler con margen del 60%</p>
        </header>
        <div className="be-dash">
          <div className="be-ring-wrap">
            <div
              className="be-ring"
              style={{
                background: `conic-gradient(${GENERAL_CHART.breakEven} ${kpis.coveragePct}%, rgba(255,255,255,0.08) 0)`,
              }}
            >
              <div className="be-ring-inner">
                <strong>{kpis.coveragePct.toFixed(0)}%</strong>
                <span>cubierto</span>
              </div>
            </div>
          </div>
          <div className="be-copy">
            {covered ? (
              <>
                <p className="be-ok">✓ Alquiler cubierto</p>
                <p>
                  Ganancia bruta {formatMoney(kpis.gross)} · Resultado neto{' '}
                  <strong className="ok">{formatMoney(kpis.net)}</strong>
                </p>
              </>
            ) : (
              <>
                <p>
                  Ganancia acumulada <strong>{formatMoney(kpis.gross)}</strong>
                </p>
                <p className="be-remain">
                  Restan <strong>{formatMoney(kpis.grossToBreakEven)}</strong> de ganancia
                </p>
                <p>
                  Facturación necesaria ≈ <strong>{formatMoney(kpis.revenueToBreakEven)}</strong>
                </p>
              </>
            )}
            {kpis.breakEvenDay ? (
              <p className="be-estimate">
                Equilibrio estimado {formatIsoDayLabel(kpis.breakEvenDay)}
                {kpis.breakEvenHourLabel ? ` · ${kpis.breakEvenHourLabel}` : ''}
              </p>
            ) : null}
            <p className="be-meta">Meta de facturación {formatMoney(BREAK_EVEN_REVENUE)}</p>
          </div>
        </div>
      </section>

      {/* 5 */}
      <section className="g-card">
        <header className="g-card-head">
          <h2>Escenarios de cierre</h2>
          <p>Rango razonable hacia el 26/07 — el probable es el eje</p>
        </header>
        <div className="scenario-grid">
          {scenarios.map((s) => (
            <div
              key={s.key}
              className={`scenario-card scenario-${s.key}${s.key === 'probable' ? ' scenario-main' : ''}`}
            >
              <div className="scenario-label">{s.label}</div>
              <div className="scenario-net" data-pos={s.net >= 0}>
                {formatMoney(s.net)}
              </div>
              <div className="scenario-cap">Ganancia neta</div>
              <div className="scenario-rows">
                <div>
                  <span>Facturación</span>
                  <strong>{formatMoney(s.revenue)}</strong>
                </div>
                <div>
                  <span>Ganancia bruta</span>
                  <strong>{formatMoney(s.gross)}</strong>
                </div>
                <div>
                  <span>Equilibrio</span>
                  <strong>
                    {s.breakEvenDay ? formatIsoDayLabel(s.breakEvenDay) : '—'}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="scenario-note">
          Probable ≈ {formatMoney(probable.revenue)} de facturación y{' '}
          {formatMoney(probable.net)} de resultado neto al 26/07.
        </p>
      </section>

      {/* 6 */}
      <section className="g-card">
        <header className="g-card-head">
          <h2>Qué genera las ventas</h2>
          <p>Artículos y motivos que sostienen la facturación</p>
        </header>
        <div className="drivers-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={driversTab === 'products'}
            className={driversTab === 'products' ? 'is-active' : ''}
            onClick={() => setDriversTab('products')}
          >
            Top artículos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={driversTab === 'motifs'}
            className={driversTab === 'motifs' ? 'is-active' : ''}
            onClick={() => setDriversTab('motifs')}
          >
            Top motivos
          </button>
        </div>

        {driversTab === 'products' ? (
          <ul className="drivers-list">
            {products.map((p, i) => (
              <li key={p.name} className={i < 3 ? 'is-top' : ''}>
                <span className="drivers-rank">{i + 1}</span>
                <div className="drivers-body">
                  <div className="drivers-line">
                    <strong>{p.name}</strong>
                    <span className="drivers-amount">{formatMoney(p.revenue)}</span>
                  </div>
                  <div className="drivers-meta">
                    {p.units} u. · {p.share.toFixed(0)}% · bruta {formatMoney(p.gross)}
                  </div>
                  <div className="drivers-bar">
                    <span style={{ width: `${(p.share / maxProductShare) * 100}%` }} />
                  </div>
                </div>
              </li>
            ))}
            {!products.length && <li className="drivers-empty">Sin datos</li>}
          </ul>
        ) : (
          <ul className="drivers-list">
            {motifs.map((m, i) => (
              <li key={m.name} className={i < 3 ? 'is-top' : ''}>
                <span className="drivers-rank">{i + 1}</span>
                <div className="drivers-body">
                  <div className="drivers-line">
                    <strong>{displayMotif(m.name)}</strong>
                    <span className="drivers-amount">{formatMoney(m.revenue)}</span>
                  </div>
                  <div className="drivers-meta">
                    {m.units} u. · {m.share.toFixed(0)}% · bruta {formatMoney(m.gross)}
                  </div>
                  <div className="drivers-bar">
                    <span style={{ width: `${(m.share / maxMotifShare) * 100}%` }} />
                  </div>
                </div>
              </li>
            ))}
            {!motifs.length && <li className="drivers-empty">Sin datos</li>}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone?: 'ok' | 'bad' | 'sky' | 'warn';
}) {
  return (
    <div className={`g-kpi${tone ? ` g-kpi-${tone}` : ''}`}>
      <div className="g-kpi-title">{title}</div>
      <div className="g-kpi-value">{value}</div>
    </div>
  );
}
