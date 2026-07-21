import { useQuery } from '@tanstack/react-query';
import { Modal, ModalBody, ModalHeader, Spinner } from 'reactstrap';
import { api } from '../../api/api';
import { formatIsoDayLabel, todayIsoDate } from '../shared/dates';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function TopMotifsModal({ isOpen, onClose }: Props) {
  const query = useQuery({
    queryKey: ['stats-top-motifs'],
    queryFn: () => api.statistics.topMotifs(10),
    enabled: isOpen,
  });

  const today = todayIsoDate();
  const error = query.error
    ? query.error instanceof NetworkError ||
      query.error instanceof TimeoutError ||
      query.error instanceof ApiError
      ? query.error.message
      : 'No se pudo cargar el top'
    : null;

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      fullscreen="sm"
      className="fullscreen-modal"
      scrollable
    >
      <ModalHeader toggle={onClose}>Top motivos</ModalHeader>
      <ModalBody>
        {query.isLoading && (
          <div className="text-center py-4">
            <Spinner />
          </div>
        )}

        {error && (
          <div className="error-banner">
            {error}{' '}
            <button type="button" className="btn btn-link p-0" onClick={() => query.refetch()}>
              Reintentar
            </button>
          </div>
        )}

        {query.data && query.data.days.length === 0 && (
          <p className="text-muted mb-0">Todavía no hay ventas.</p>
        )}

        {query.data?.days.map((block) => (
          <section key={block.day} className="top-day-block">
            <h2 className="top-day-title">
              {block.day === today ? 'Hoy' : `Día ${formatIsoDayLabel(block.day)}`}
            </h2>
            <ol className="top-motif-list">
              {block.motifs.map((m, i) => (
                <li key={`${block.day}-${m.motifName}`}>
                  <span className="top-rank">{i + 1}</span>
                  <span className="top-name">{m.motifName}</span>
                  <span className="top-units">{m.units}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </ModalBody>
    </Modal>
  );
}
