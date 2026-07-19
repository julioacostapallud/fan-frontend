import { Link } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner } from 'reactstrap';
import { useState } from 'react';
import { api } from '../../api/api';
import { SaleCard } from './SaleCard';
import { NewSaleModal } from './NewSaleModal';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';
import type { SaleDetail, SaleListItem } from '../../api/types';

export function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleDetail | null>(null);
  const [deletingSale, setDeletingSale] = useState<SaleListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const salesQuery = useInfiniteQuery({
    queryKey: ['sales'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.sales.list({ page: pageParam, limit: 20 }),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });

  const sales = salesQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const errorMessage = salesQuery.error
    ? salesQuery.error instanceof NetworkError ||
      salesQuery.error instanceof TimeoutError ||
      salesQuery.error instanceof ApiError
      ? salesQuery.error.message
      : 'No se pudieron cargar las ventas'
    : null;

  async function openEdit(sale: SaleListItem) {
    setActionError(null);
    try {
      const detail = await api.sales.get(sale.id);
      setEditingSale(detail);
      setModalOpen(true);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'No se pudo abrir la venta',
      );
    }
  }

  async function confirmDelete() {
    if (!deletingSale) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.sales.remove(deletingSale.id);
      setDeletingSale(null);
      await queryClient.invalidateQueries({ queryKey: ['sales'] });
      await queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['stats-products'] });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'No se pudo eliminar la venta',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <Link to="/estadisticas">Stats</Link>
        <Link to="/admin">Productos</Link>
      </nav>

      <header className="brand-lockup">
        <div className="brand-name">
          Fan<span>!</span>
        </div>
        <div className="brand-edition">Bienal 2026</div>
      </header>

      <div className="cta-stack">
        <Button
          color="primary"
          className="btn-touch btn-primary-fan"
          onClick={() => {
            setEditingSale(null);
            setModalOpen(true);
          }}
        >
          Nueva venta
        </Button>
        <Button
          tag={Link}
          to="/estadisticas"
          className="btn-touch btn-secondary-fan"
        >
          Stats
        </Button>
      </div>

      <h2 className="section-title">Ventas</h2>

      {(errorMessage || actionError) && (
        <div className="error-banner">
          {actionError || errorMessage}{' '}
          {errorMessage && (
            <button
              type="button"
              className="btn btn-link p-0 align-baseline"
              onClick={() => salesQuery.refetch()}
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {salesQuery.isLoading && (
        <>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </>
      )}

      {!salesQuery.isLoading && sales.length === 0 && !errorMessage && (
        <div className="empty-state">
          <p className="mb-1">Todavía no se registraron ventas.</p>
          <p className="mb-0">Presioná “Nueva venta” para cargar la primera.</p>
        </div>
      )}

      {sales.map((sale) => (
        <SaleCard
          key={sale.id}
          sale={sale}
          onEdit={openEdit}
          onDelete={setDeletingSale}
        />
      ))}

      {salesQuery.hasNextPage && (
        <Button
          block
          className="btn-touch btn-secondary-fan mt-2"
          disabled={salesQuery.isFetchingNextPage}
          onClick={() => salesQuery.fetchNextPage()}
        >
          {salesQuery.isFetchingNextPage ? (
            <>
              <Spinner size="sm" className="me-2" /> Cargando…
            </>
          ) : (
            'Cargar más'
          )}
        </Button>
      )}

      <NewSaleModal
        isOpen={modalOpen}
        editingSale={editingSale}
        onClose={() => {
          setModalOpen(false);
          setEditingSale(null);
        }}
        onSaved={async () => {
          setModalOpen(false);
          setEditingSale(null);
          await queryClient.invalidateQueries({ queryKey: ['sales'] });
          await queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
          await queryClient.invalidateQueries({ queryKey: ['stats-products'] });
        }}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deletingSale)}
        busy={deleting}
        onCancel={() => setDeletingSale(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
