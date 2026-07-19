import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Spinner, Table } from 'reactstrap';
import { api } from '../../api/api';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';

export function RestockPage() {
  const query = useQuery({
    queryKey: ['stats-restock'],
    queryFn: () => api.statistics.restock(),
  });

  const error = query.error
    ? query.error instanceof NetworkError ||
      query.error instanceof TimeoutError ||
      query.error instanceof ApiError
      ? query.error.message
      : 'No se pudo cargar la reposición'
    : null;

  return (
    <div className="app-shell">
      <div className="page-header">
        <Button tag={Link} to="/" color="link" className="p-0">
          ←
        </Button>
        <h1>Reposición</h1>
      </div>

      <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
        Unidades vendidas por producto y motivo (todo el período).
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

      {query.data && query.data.length === 0 && (
        <div className="empty-state">Todavía no hay ventas para reponer.</div>
      )}

      {query.data && query.data.length > 0 && (
        <div className="table-wrap">
          <Table borderless className="stats-table mb-0">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Motivo</th>
                <th className="text-end">Unidades</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((row) => (
                <tr key={`${row.productName}-${row.motifName}`}>
                  <td>{row.productName}</td>
                  <td>{row.motifName}</td>
                  <td className="text-end">{row.units}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
