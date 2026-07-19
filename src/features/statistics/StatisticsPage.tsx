import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Nav, NavItem, NavLink, Spinner, Table } from 'reactstrap';
import { useState } from 'react';
import { api } from '../../api/api';
import { formatMoney } from '../shared/money';
import { todayIsoDate } from '../shared/dates';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';

type Tab = 'general' | 'hoy';

export function StatisticsPage() {
  const [tab, setTab] = useState<Tab>('hoy');

  const range =
    tab === 'hoy'
      ? { from: todayIsoDate(), to: todayIsoDate() }
      : { from: undefined, to: undefined };

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
        <div className="table-wrap">
          <Table borderless className="stats-table mb-0">
            <thead>
              <tr>
                <th>Nombre</th>
                <th className="text-end">Productos</th>
                <th className="text-end">Monto</th>
              </tr>
            </thead>
            <tbody>
              {query.data.sellers.map((s) => (
                <tr key={s.userId}>
                  <td>{s.name}</td>
                  <td className="text-end">{s.products}</td>
                  <td className="text-end">{formatMoney(s.amount)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>Total</td>
                <td className="text-end">{query.data.total.products}</td>
                <td className="text-end">{formatMoney(query.data.total.amount)}</td>
              </tr>
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
