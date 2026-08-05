import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner } from 'reactstrap';
import { api } from '../../api/api';
import type { EventSummary } from '../../api/types';
import { formatMoney } from '../shared/money';
import { formatIsoDayLabel } from '../shared/dates';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';
import { LobbyHeader } from '../shared/LobbyHeader';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';
import { IconTrash } from '../shared/Icons';

export function EventsHomePage() {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<EventSummary | null>(null);

  const query = useQuery({
    queryKey: ['events'],
    queryFn: () => api.events.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.events.remove(id),
    onSuccess: async () => {
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const error = query.error
    ? query.error instanceof NetworkError ||
      query.error instanceof TimeoutError ||
      query.error instanceof ApiError
      ? query.error.message
      : 'No se pudieron cargar los eventos'
    : null;

  const deleteError =
    deleteMutation.error instanceof NetworkError ||
    deleteMutation.error instanceof TimeoutError ||
    deleteMutation.error instanceof ApiError
      ? deleteMutation.error.message
      : deleteMutation.error
        ? 'No se pudo eliminar el evento'
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

      {deleteError && <div className="error-banner">{deleteError}</div>}

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
          <div
            key={event.id}
            className={`event-card${event.isCurrent ? ' is-current' : ''}`}
          >
            <Link to={`/eventos/${event.id}`} className="event-card-link">
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
            <button
              type="button"
              className="event-card-delete"
              aria-label={`Eliminar evento ${event.name}`}
              onClick={() => {
                deleteMutation.reset();
                setDeleting(event);
              }}
            >
              <IconTrash size={18} />
            </button>
          </div>
        ))}
      </div>

      <ConfirmDeleteModal
        isOpen={Boolean(deleting)}
        busy={deleteMutation.isPending}
        title="Eliminar evento"
        message={
          deleting
            ? `Vas a eliminar «${deleting.name}». Se eliminarán TODAS las ventas de ese evento, junto con sus gastos y precios. Esta acción no se puede deshacer.`
            : undefined
        }
        onCancel={() => {
          if (!deleteMutation.isPending) setDeleting(null);
        }}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id);
        }}
      />
    </div>
  );
}
