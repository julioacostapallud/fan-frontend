import { useNavigate } from 'react-router-dom';
import type { SaleListItem } from '../../api/types';
import { formatMoney } from '../shared/money';
import { formatSaleDate, formatSaleTime } from '../shared/dates';
import { IconEdit, IconTrash } from '../shared/Icons';

interface Props {
  sale: SaleListItem;
  onEdit: (sale: SaleListItem) => void;
  onDelete: (sale: SaleListItem) => void;
}

export function SaleCard({ sale, onEdit, onDelete }: Props) {
  const navigate = useNavigate();
  const summary = sale.productSummary.join(' · ');

  return (
    <div className="sale-row">
      <button
        type="button"
        className="sale-row-main"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          padding: 0,
          textAlign: 'left',
          cursor: 'pointer',
        }}
        onClick={() => navigate(`/ventas/${sale.id}`)}
      >
        <div className="sale-row-top">
          <div className="sale-row-time">{formatSaleTime(sale.createdAt)}</div>
          <div className="sale-row-total">{formatMoney(sale.total)}</div>
        </div>
        <div className="sale-row-meta">
          {formatSaleDate(sale.createdAt)} · {sale.totalUnits} u. · {sale.lineCount}{' '}
          {sale.lineCount === 1 ? 'ítem' : 'ítems'}
          {sale.user ? ` · ${sale.user.displayName}` : ''}
        </div>
        <div className="sale-row-products" title={summary}>
          {summary}
        </div>
      </button>

      <div className="sale-row-actions">
        <button
          type="button"
          className="icon-btn"
          aria-label="Editar venta"
          onClick={() => onEdit(sale)}
        >
          <IconEdit />
        </button>
        <button
          type="button"
          className="icon-btn danger"
          aria-label="Eliminar venta"
          onClick={() => onDelete(sale)}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}
