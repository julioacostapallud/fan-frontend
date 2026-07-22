import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Nav, NavItem, NavLink, Spinner } from 'reactstrap';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/api';
import { formatMoney } from '../shared/money';
import { formatIsoDayLabel, todayIsoDate } from '../shared/dates';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';
import { TopMotifsModal } from './TopMotifsModal';
import { DailyTotalsChart } from './DailyTotalsChart';

type Tab = 'general' | 'hoy' | string; // string = yyyy-MM-dd de un día cerrado

function rangeForTab(tab: Tab): { from?: string; to?: string } {
  if (tab === 'general') return { from: undefined, to: undefined };
  if (tab === 'hoy') {
    const today = todayIsoDate();
    return { from: today, to: today };
  }
  return { from: tab, to: tab };
}

export function StatisticsPage() {
  const [tab, setTab] = useState<Tab>('hoy');
  const [topOpen, setTopOpen] = useState(false);

  const daysQuery = useQuery({
    queryKey: ['stats-days'],
    queryFn: () => api.statistics.days(),
  });

  const closedDays = daysQuery.data?.days ?? [];

  useEffect(() => {
    if (tab === 'general' || tab === 'hoy') return;
    if (closedDays.length > 0 && !closedDays.includes(tab)) {
      setTab('hoy');
    }
  }, [closedDays, tab]);

  const range = useMemo(() => rangeForTab(tab), [tab]);

  const query = useQuery({
    queryKey: ['stats-sellers', tab, range.from, range.to],
    queryFn: () => api.statistics.sellers(range.from, range.to),
  });

  const error = query.error
    ? query.error instanceof NetworkError ||
      query.error instanceof TimeoutError ||
      query.error instanceof ApiError
      ? query.error.message
      : 'No se pudieron cargar las estadísticas'
    : null;

  return (
    <div className="app-shell">
      <div className="page-header">
        <Button tag={Link} to="/" color="link" className="p-0">
          ←
        </Button>
        <h1>Stats ventas</h1>
        <Button
          type="button"
          className="btn-top-motifs ms-auto"
          onClick={() => setTopOpen(true)}
        >
          TOP
        </Button>
      </div>

      <Nav pills className="stats-tabs mb-3">
        <NavItem>
          <NavLink
            href="#"
            active={tab === 'general'}
            onClick={(e) => {
              e.preventDefault();
              setTab('general');
            }}
          >
            General
          </NavLink>
        </NavItem>
        {closedDays.map((day) => (
          <NavItem key={day}>
            <NavLink
              href="#"
              active={tab === day}
              onClick={(e) => {
                e.preventDefault();
                setTab(day);
              }}
            >
              Día {formatIsoDayLabel(day)}
            </NavLink>
          </NavItem>
        ))}
        <NavItem>
          <NavLink
            href="#"
            active={tab === 'hoy'}
            onClick={(e) => {
              e.preventDefault();
              setTab('hoy');
            }}
          >
            Hoy
          </NavLink>
        </NavItem>
      </Nav>

      {error && (
        <div className="error-banner">
          {error}{' '}
          <button type="button" className="btn btn-link p-0" onClick={() => query.refetch()}>
            Reintentar
          </button>
        </div>
      )}

      {query.isLoading && (
        <div className="text-center py-4">
          <Spinner />
        </div>
      )}

      {query.data && (
        <>
          <div className="stats-sellers">
            <div className="stats-sellers-head">
              <span>Vendedor</span>
              <span className="text-end">Prod.</span>
              <span className="text-end">Monto</span>
            </div>
            {query.data.sellers.map((s) => (
              <div key={s.userId} className="stats-seller-row">
                <span className="stats-seller-name">{s.name}</span>
                <span className="stats-seller-products">{s.products}</span>
                <span className="stats-seller-amount">{formatMoney(s.amount)}</span>
              </div>
            ))}
            <div className="stats-seller-row stats-seller-total">
              <span className="stats-seller-name">Total</span>
              <span className="stats-seller-products">{query.data.total.products}</span>
              <span className="stats-seller-amount">
                {formatMoney(query.data.total.amount)}
              </span>
            </div>
          </div>

          {tab === 'general' && <DailyTotalsChart />}
        </>
      )}

      <TopMotifsModal isOpen={topOpen} onClose={() => setTopOpen(false)} />
    </div>
  );
}
