import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner } from 'reactstrap';
import { useState } from 'react';
import { api } from '../../api/api';
import { formatMoney } from '../shared/money';
import { formatSaleDateTime } from '../shared/dates';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';
import { NewSaleModal } from './NewSaleModal';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';

function discountLabel(
  type: string,
  value: string,
  amount: string,
): string | null {
  if (type === 'NONE' || Number(amount) === 0) return null;
  if (type === 'PERCENTAGE') {
    return `${value}% (−${formatMoney(amount)})`;
  }
  return `−${formatMoney(amount)}`;
}

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const query = useQuery({
    queryKey: ['sale', id],
    queryFn: () => api.sales.get(id!),
    enabled: Boolean(id),
  });

  if (query.isLoading) {
    return (
      <div className="app-shell text-center py-5">
        <Spinner />
      </div>
    );
  }

  if (query.error || !query.data) {
    const message =
      query.error instanceof NetworkError ||
      query.error instanceof TimeoutError ||
      query.error instanceof ApiError
        ? query.error.message
        : 'No se encontró la venta';
    return (
      <div className="app-shell">
        <div className="error-banner">{message}</div>
        <Button tag={Link} to="/" className="btn-touch btn-secondary-fan">
          Volver
        </Button>
      </div>
    );
  }

  const sale = query.data;
  const generalDiscount = discountLabel(
    sale.generalDiscountType,
    sale.generalDiscountValue,
    sale.generalDiscountAmount,
  );

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.sales.remove(sale.id);
      await queryClient.invalidateQueries({ queryKey: ['sales'] });
      await queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['stats-products'] });
      navigate('/');
    } catch (err) {
      setDeleting(false);
      alert(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  return (
    <div className="app-shell">
      <div className="page-header">
        <Button tag={Link} to="/" color="link" className="p-0">
          ←
        </Button>
        <h1>Venta</h1>
      </div>

      <p className="text-muted mb-2">
        {formatSaleDateTime(sale.createdAt)}
        {sale.user ? ` · ${sale.user.displayName}` : ''}
      </p>

      {sale.items.map((item) => {
        const itemDiscount = discountLabel(
          item.discountType,
          item.discountValue,
          item.discountAmount,
        );
        return (
          <div key={item.id} className="item-card">
            <div className="d-flex justify-content-between gap-2">
              <strong>
                {item.product.name} · {item.motif.name}
              </strong>
              <strong>{formatMoney(item.lineTotal)}</strong>
            </div>
            <div className="sale-row-meta mt-1">
              {item.quantity} × {formatMoney(item.unitPrice)}
            </div>
            {itemDiscount && (
              <div className="sale-row-meta">Desc.: {itemDiscount}</div>
            )}
            {item.imageBase64 && item.imageMimeType && (
              <img
                className="image-preview mt-2"
                alt={`${item.product.name} ${item.motif.name}`}
                src={`data:${item.imageMimeType};base64,${item.imageBase64}`}
                loading="lazy"
              />
            )}
          </div>
        );
      })}

      <div className="summary-box">
        <div className="row-line">
          <span>Subtotal</span>
          <span>{formatMoney(sale.subtotal)}</span>
        </div>
        {generalDiscount && (
          <div className="row-line">
            <span>Desc. general</span>
            <span>{generalDiscount}</span>
          </div>
        )}
        <div className="total-line">
          <span>Total</span>
          <span>{formatMoney(sale.total)}</span>
        </div>
      </div>

      {sale.notes && (
        <div className="mt-3">
          <strong>Notas</strong>
          <p className="mb-0 text-muted">{sale.notes}</p>
        </div>
      )}

      <div className="detail-actions">
        <Button className="btn-touch btn-secondary-fan" onClick={() => setEditOpen(true)}>
          Editar
        </Button>
        <Button color="danger" className="btn-touch" onClick={() => setDeleteOpen(true)}>
          Eliminar
        </Button>
      </div>

      <NewSaleModal
        isOpen={editOpen}
        editingSale={sale}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          setEditOpen(false);
          await query.refetch();
          await queryClient.invalidateQueries({ queryKey: ['sales'] });
        }}
      />

      <ConfirmDeleteModal
        isOpen={deleteOpen}
        busy={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
