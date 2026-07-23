import { useQuery } from '@tanstack/react-query';
import { Modal, ModalBody, ModalHeader, Spinner } from 'reactstrap';
import { api } from '../../api/api';
import { formatIsoDayLabel, todayIsoDate } from '../shared/dates';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

function displayMotif(name: string): string {
  return name === '-' || name.trim() === '' ? 'Sin motivo' : name;
}

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
      className="top-motifs-sheet"
      contentClassName="top-motifs-sheet-content"
      scrollable
      centered
    >
      <ModalHeader toggle={onClose} className="top-motifs-sheet-head">
        Top motivos
      </ModalHeader>
      <ModalBody className="top-motifs-sheet-body">
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
                  <span className="top-name">{displayMotif(m.motifName)}</span>
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
