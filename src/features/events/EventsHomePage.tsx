import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Spinner } from 'reactstrap';
import { api } from '../../api/api';
import { formatMoney } from '../shared/money';
import { formatIsoDayLabel } from '../shared/dates';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';
import { LobbyHeader } from '../shared/LobbyHeader';

export function EventsHomePage() {
  const query = useQuery({
    queryKey: ['events'],
    queryFn: () => api.events.list(),
  });

  const error = query.error
    ? query.error instanceof NetworkError ||
      query.error instanceof TimeoutError ||
      query.error instanceof ApiError
      ? query.error.message
      : 'No se pudieron cargar los eventos'
    : null;

  const events = query.data ?? [];

  return (
    <div className="app-shell">
      <LobbyHeader />

      <div className="page-header">
        <h1 className="page-title">Eventos</h1>
        <Button
          tag={Link}
          to="/eventos/nuevo"
          color="primary"
          className="btn-touch btn-primary-fan ms-auto"
        >
          Agregar evento
        </Button>
      </div>

      <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
        Elegí un evento para cargar ventas, productos y gastos.
      </p>

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

      {!query.isLoading && events.length === 0 && !error && (
        <div className="empty-state">
          <p className="mb-1">Todavía no hay eventos.</p>
          <p className="mb-0">Creá el primero para cargar ventas y gastos.</p>
        </div>
      )}

      <div className="events-list">
        {events.map((event) => (
          <Link
            key={event.id}
            to={`/eventos/${event.id}`}
            className={`event-card${event.isCurrent ? ' is-current' : ''}`}
          >
            <div className="event-card-top">
              <h2 className="event-card-title">{event.name}</h2>
              {event.isCurrent && <span className="event-card-badge">Actual</span>}
            </div>
            <p className="event-card-dates">
              {formatIsoDayLabel(event.startDate)} — {formatIsoDayLabel(event.endDate)}
            </p>
            <div className="event-card-metrics">
              <div>
                <span className="event-metric-label">Gastos</span>
                <strong>{formatMoney(Number(event.expensesTotal))}</strong>
              </div>
              <div>
                <span className="event-metric-label">Recaudación</span>
                <strong>{formatMoney(Number(event.revenue))}</strong>
              </div>
              <div>
                <span className="event-metric-label">Ganancia real</span>
                <strong
                  className={
                    Number(event.realProfit) > 0
                      ? 'text-ok'
                      : Number(event.realProfit) < 0
                        ? 'text-danger'
                        : undefined
                  }
                >
                  {formatMoney(Number(event.realProfit))}
                </strong>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
