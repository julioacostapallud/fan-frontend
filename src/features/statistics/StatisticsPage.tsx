import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, FormGroup, Input, Label, Spinner } from 'reactstrap';
import { api } from '../../api/api';
import { formatMoney } from '../shared/money';
import { todayIsoDate } from '../shared/dates';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';

type RangeMode = 'all' | 'today' | 'custom';

export function StatisticsPage() {
  const [mode, setMode] = useState<RangeMode>('all');
  const [from, setFrom] = useState(todayIsoDate());
  const [to, setTo] = useState(todayIsoDate());

  const range = useMemo(() => {
    if (mode === 'all') return { from: undefined, to: undefined };
    if (mode === 'today') {
      const d = todayIsoDate();
      return { from: d, to: d };
    }
    return { from, to };
  }, [mode, from, to]);

  const summaryQuery = useQuery({
    queryKey: ['stats-summary', range.from, range.to],
    queryFn: () => api.statistics.summary(range.from, range.to),
  });

  const productsQuery = useQuery({
    queryKey: ['stats-products', range.from, range.to],
    queryFn: () => api.statistics.products(range.from, range.to),
  });

  const error =
    summaryQuery.error || productsQuery.error
      ? summaryQuery.error instanceof NetworkError ||
        summaryQuery.error instanceof TimeoutError ||
        summaryQuery.error instanceof ApiError
        ? summaryQuery.error.message
        : productsQuery.error instanceof Error
          ? productsQuery.error.message
          : 'No se pudieron cargar las estadísticas'
      : null;

  const maxMotifUnits = Math.max(
    1,
    ...(productsQuery.data ?? []).flatMap((p) => p.motifs.map((m) => m.units)),
  );

  return (
    <div className="app-shell">
      <div className="page-header">
        <Button tag={Link} to="/" color="link" className="p-0">
          ←
        </Button>
        <h1>Estadísticas</h1>
      </div>

      <FormGroup>
        <Label className="form-label">Período</Label>
        <Input
          type="select"
          value={mode}
          onChange={(e) => setMode(e.target.value as RangeMode)}
        >
          <option value="all">Todo el período</option>
          <option value="today">Hoy</option>
          <option value="custom">Rango personalizado</option>
        </Input>
      </FormGroup>

      {mode === 'custom' && (
        <div className="d-flex gap-2 mb-3">
          <FormGroup className="flex-fill">
            <Label className="form-label">Desde</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </FormGroup>
          <FormGroup className="flex-fill">
            <Label className="form-label">Hasta</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </FormGroup>
        </div>
      )}

      {error && (
        <div className="error-banner">
          {error}{' '}
          <button
            type="button"
            className="btn btn-link p-0"
            onClick={() => {
              summaryQuery.refetch();
              productsQuery.refetch();
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {(summaryQuery.isLoading || productsQuery.isLoading) && (
        <div className="text-center py-4">
          <Spinner />
        </div>
      )}

      {summaryQuery.data && (
        <>
          <h2 className="section-title">Resumen general</h2>
          <div className="stat-grid">
            <div className="stat-tile">
              <span className="label">Total vendido</span>
              <span className="value">
                {formatMoney(summaryQuery.data.totalSold)}
              </span>
            </div>
            <div className="stat-tile">
              <span className="label">Ventas</span>
              <span className="value">{summaryQuery.data.salesCount}</span>
            </div>
            <div className="stat-tile">
              <span className="label">Unidades</span>
              <span className="value">{summaryQuery.data.totalUnits}</span>
            </div>
            <div className="stat-tile">
              <span className="label">Ticket promedio</span>
              <span className="value">
                {formatMoney(summaryQuery.data.averageTicket)}
              </span>
            </div>
            <div className="stat-tile" style={{ gridColumn: '1 / -1' }}>
              <span className="label">Descuentos aplicados</span>
              <span className="value">
                {formatMoney(summaryQuery.data.totalDiscounts)}
              </span>
            </div>
          </div>
        </>
      )}

      {productsQuery.data && (
        <>
          <h2 className="section-title">Por producto</h2>
          {productsQuery.data.length === 0 && (
            <div className="empty-state">Sin datos en el período.</div>
          )}
          {productsQuery.data.map((p) => (
            <div key={p.productId} className="product-block">
              <div className="d-flex justify-content-between">
                <strong>{p.productName}</strong>
                <strong>{formatMoney(p.net)}</strong>
              </div>
              <div className="sale-row-meta mt-1">
                {p.units} u. · {p.salesCount} ventas · bruto{' '}
                {formatMoney(p.gross)} · desc. {formatMoney(p.discounts)}
              </div>
              {p.motifs.map((m) => (
                <div key={m.motifId} className="motif-bar">
                  <span style={{ minWidth: '40%' }}>
                    {m.motifName}: {m.units}
                  </span>
                  <div className="bar">
                    <span
                      style={{
                        width: `${Math.round((m.units / maxMotifUnits) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
