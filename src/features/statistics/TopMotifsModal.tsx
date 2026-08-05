import { useQuery } from '@tanstack/react-query';
import { Modal, ModalBody, ModalHeader, Spinner } from 'reactstrap';
import { api } from '../../api/api';
import { formatIsoDayLabel, todayIsoDate } from '../shared/dates';
import { isUnrankedMotif } from '../shared/motif';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';

type Props = {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
};

export function TopMotifsModal({ eventId, isOpen, onClose }: Props) {
  const query = useQuery({
    queryKey: ['stats-top-motifs', eventId],
    queryFn: () => api.statistics.topMotifs(eventId, 12),
    enabled: isOpen && Boolean(eventId),
  });

  const today = todayIsoDate();
  const error = query.error
    ? query.error instanceof NetworkError ||
      query.error instanceof TimeoutError ||
      query.error instanceof ApiError
      ? query.error.message
      : 'No se pudo cargar el top'
    : null;

  const days = query.data?.days.map((block) => ({
    ...block,
    motifs: block.motifs
      .filter((m) => !isUnrankedMotif(m.motifName))
      .slice(0, 10),
  }));

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

        {days && days.length === 0 && (
          <p className="text-muted mb-0">Todavía no hay ventas.</p>
        )}

        {days?.map((block) => (
          <section key={block.day} className="top-day-block">
            <h2 className="top-day-title">
              {block.day === today ? 'Hoy' : `Día ${formatIsoDayLabel(block.day)}`}
            </h2>
            {block.motifs.length === 0 ? (
              <p className="text-muted mb-0">Sin motivos rankeables.</p>
            ) : (
              <ol className="top-motif-list">
                {block.motifs.map((m, i) => (
                  <li key={`${block.day}-${m.motifName}`}>
                    <span className="top-rank">{i + 1}</span>
                    <span className="top-name">{m.motifName}</span>
                    <span className="top-units">{m.units}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </ModalBody>
    </Modal>
  );
}
