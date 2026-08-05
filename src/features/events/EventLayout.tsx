import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from 'reactstrap';
import { api } from '../../api/api';
import { useAuth } from '../auth/AuthContext';
import { formatIsoDayLabel } from '../shared/dates';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';

function navClass(active: boolean) {
  return active ? 'app-nav-link is-active' : 'app-nav-link';
}

/** Shell L2: contexto del evento fijo + tabs operativos (sin lobby mezclado). */
export function EventLayout() {
  const { eventId = '' } = useParams();
  const location = useLocation();
  const { user, logout } = useAuth();
  const base = `/eventos/${eventId}`;

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => api.events.get(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const error =
    eventQuery.error instanceof NetworkError ||
    eventQuery.error instanceof TimeoutError ||
    eventQuery.error instanceof ApiError
      ? eventQuery.error.message
      : eventQuery.error
        ? 'No se pudo cargar el evento'
        : null;

  const path = location.pathname;
  const onVentas =
    path === base || path.startsWith(`${base}/ventas/`);
  const onStats = path.startsWith(`${base}/estadisticas`);
  const onRestock = path.startsWith(`${base}/reposicion`);
  const onProducts = path.startsWith(`${base}/productos`);
  const onExpenses = path.startsWith(`${base}/gastos`);

  return (
    <div className="app-shell">
      <header className="app-header app-header-event">
        <div className="app-header-bar">
          <Link to="/" className="app-header-brand" aria-label="Fan! — lista de eventos">
            <img
              src="/brand/machos-alfa-fan.png"
              alt=""
              className="app-header-mark"
              width={40}
              height={40}
            />
            <span className="app-header-wordmark">
              Fan<span>!</span>
            </span>
          </Link>

          <div className="app-header-user">
            <span className="app-header-username">{user?.displayName}</span>
            <button type="button" className="btn-ghost btn-logout" onClick={logout}>
              Salir
            </button>
          </div>
        </div>

        <div className="event-context" aria-label="Evento actual">
          <div className="event-context-main">
            {eventQuery.isLoading ? (
              <Spinner size="sm" />
            ) : (
              <>
                <p className="event-context-name">{event?.name ?? 'Evento'}</p>
                {event && (
                  <p className="event-context-dates">
                    {formatIsoDayLabel(event.startDate)} —{' '}
                    {formatIsoDayLabel(event.endDate)}
                    {event.isCurrent ? ' · En curso' : ''}
                  </p>
                )}
              </>
            )}
          </div>
          <Link to="/" className="event-context-switch">
            Cambiar evento
          </Link>
        </div>

        <nav className="app-nav" aria-label="Del evento">
          <div className="app-nav-scroll">
            <Link to={base} className={navClass(onVentas)}>
              Ventas
            </Link>
            <Link to={`${base}/estadisticas`} className={navClass(onStats)}>
              Stats
            </Link>
            <Link to={`${base}/reposicion`} className={navClass(onRestock)}>
              Reposición
            </Link>
            <Link to={`${base}/productos`} className={navClass(onProducts)}>
              Productos
            </Link>
            <Link to={`${base}/gastos`} className={navClass(onExpenses)}>
              Gastos
            </Link>
          </div>
        </nav>
      </header>

      {error && !event && (
        <div className="error-banner">
          {error}{' '}
          <Link to="/">Volver a eventos</Link>
        </div>
      )}

      <Outlet context={{ eventId, event: event ?? null }} />
    </div>
  );
}
