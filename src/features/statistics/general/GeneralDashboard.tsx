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

export function GeneralDashboard() {
  const { model, isLoading, error, refetch } = useGeneralEventModel();

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

  const { kpis, days, scenarios, products, motifs } = model;
  const covered = kpis.gross >= RENT;

  const cumData = days.map((d) => ({
    label: d.label,
    real: d.cumulativeReal,
    projected: d.cumulativeProjected,
  }));

  const netData = [
    { label: 'Inicio', real: -RENT, projected: -RENT },
    ...days.map((d) => ({
      label: d.label,
      real: d.netReal,
      projected: d.netProjected,
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

  return (
    <div className="general-dash">
      <p className="general-lead">
        Evento 18/07 → 26/07 · Día comercial 06:00–06:00 · Margen 60% · Alquiler{' '}
        {formatMoney(RENT)}
      </p>

      <div className="general-kpis">
        <Kpi title="Facturación actual" value={formatMoney(kpis.revenue)} />
        <Kpi title="Ganancia bruta" value={formatMoney(kpis.gross)} tone="sky" />
        <Kpi
          title="Resultado neto"
          value={formatMoney(kpis.net)}
          tone={kpis.net >= 0 ? 'ok' : 'bad'}
        />
        <Kpi title="Alquiler" value={formatMoney(kpis.rent)} />
        <Kpi
          title="Proyección al 26/07"
          value={formatMoney(kpis.projectedRevenue)}
          tone="sky"
        />
        <Kpi
          title="Neto proyectado"
          value={formatMoney(kpis.projectedNet)}
          tone={kpis.projectedNet >= 0 ? 'ok' : 'bad'}
        />
        <Kpi title="% alquiler cubierto" value={`${kpis.coveragePct.toFixed(0)}%`} />
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

      {/* 1 */}
      <section className="g-card">
        <header className="g-card-head">
          <h2>Facturación acumulada</h2>
          <p>Real hasta hoy y proyección hasta el cierre del evento</p>
        </header>
        <div className="g-chart g-chart-lg">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid stroke={GENERAL_CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: GENERAL_CHART.axis, fontSize: 12 }} />
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
                formatter={(v: number, name: string) => [
                  formatMoney(v),
                  name === 'real' ? 'Real' : 'Proyectada',
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="real"
                name="Real"
                stroke={GENERAL_CHART.real}
                strokeWidth={3}
                dot={{ r: 4 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="projected"
                name="Proyectada"
                stroke={GENERAL_CHART.projected}
                strokeWidth={2.5}
                strokeDasharray="8 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 2 */}
      <section className="g-card">
        <header className="g-card-head">
          <h2>Resultado neto</h2>
          <p>Parte de −{formatMoney(RENT)}. Cruzar cero = alquiler cubierto</p>
        </header>
        <div className="g-chart g-chart-lg">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={netData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid stroke={GENERAL_CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: GENERAL_CHART.axis, fontSize: 12 }} />
              <YAxis
                tickFormatter={axisMoney}
                tick={{ fill: GENERAL_CHART.axis, fontSize: 12 }}
                width={52}
              />
              <ReferenceLine y={0} stroke={GENERAL_CHART.breakEven} strokeWidth={2} />
              <Tooltip
                contentStyle={generalTooltipStyle}
                formatter={(v: number, name: string) => [
                  formatMoney(v),
                  name === 'real' ? 'Real' : 'Proyectado',
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="real"
                name="Real"
                stroke={GENERAL_CHART.netPositive}
                strokeWidth={3}
                dot={{ r: 3 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="projected"
                name="Proyectado"
                stroke={GENERAL_CHART.projected}
                strokeWidth={2.5}
                strokeDasharray="8 5"
                dot={false}
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
              <Legend />
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
                <p>
                  Restan <strong>{formatMoney(kpis.grossToBreakEven)}</strong> de ganancia
                </p>
                <p>
                  Equivale a facturar ≈ <strong>{formatMoney(kpis.revenueToBreakEven)}</strong>
                </p>
              </>
            )}
            <p className="be-meta">
              Meta de facturación {formatMoney(BREAK_EVEN_REVENUE)}
              {kpis.breakEvenDay
                ? ` · Estimado ${formatIsoDayLabel(kpis.breakEvenDay)}${
                    kpis.breakEvenHourLabel ? ` ${kpis.breakEvenHourLabel}` : ''
                  }`
                : ''}
            </p>
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
          <p>Artículos y motivos que sostienen la facturación del evento</p>
        </header>
        <div className="drivers-grid">
          <div>
            <h3 className="drivers-title">Top artículos</h3>
            <ul className="drivers-list">
              {products.map((p, i) => (
                <li key={p.name}>
                  <span className="drivers-rank" style={{ color: GENERAL_CHART.product }}>
                    {i + 1}
                  </span>
                  <div className="drivers-body">
                    <strong>{p.name}</strong>
                    <span>
                      {p.units} u. · {formatMoney(p.revenue)} · {p.share.toFixed(0)}% · bruta{' '}
                      {formatMoney(p.gross)}
                    </span>
                  </div>
                </li>
              ))}
              {!products.length && <li className="drivers-empty">Sin datos</li>}
            </ul>
          </div>
          <div>
            <h3 className="drivers-title">Top motivos</h3>
            <ul className="drivers-list">
              {motifs.map((m, i) => (
                <li key={m.name}>
                  <span className="drivers-rank" style={{ color: GENERAL_CHART.motif }}>
                    {i + 1}
                  </span>
                  <div className="drivers-body">
                    <strong>{m.name}</strong>
                    <span>
                      {m.units} u. · {formatMoney(m.revenue)} · {m.share.toFixed(0)}% · bruta{' '}
                      {formatMoney(m.gross)}
                    </span>
                  </div>
                </li>
              ))}
              {!motifs.length && <li className="drivers-empty">Sin datos</li>}
            </ul>
          </div>
        </div>
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
