import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Spinner } from 'reactstrap';
import { api } from '../../api/api';
import { formatMoney } from '../shared/money';
import { formatIsoDayLabel } from '../shared/dates';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';
import { AppHeader } from '../shared/AppHeader';

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
      <AppHeader />

      <section className="home-hero" aria-label="Eventos">
        <div className="home-hero-brand">
          <img
            src="/brand/machos-alfa-fan.png"
            alt="Machos Alfa Fan!"
            className="home-hero-mark"
          />
          <p className="home-hero-event">Eventos</p>
        </div>
        <div className="home-hero-actions">
          <Button
            tag={Link}
            to="/eventos/nuevo"
            color="primary"
            className="btn-touch btn-primary-fan"
          >
            Agregar evento
          </Button>
        </div>
      </section>

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
