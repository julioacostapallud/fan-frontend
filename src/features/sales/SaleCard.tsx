import { useEffect, useRef, useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const productLine =
    sale.productSummary.length > 0
      ? `${sale.productSummary.join(' · ')} × ${sale.totalUnits}`
      : `${sale.totalUnits} u. · ${sale.lineCount} ${sale.lineCount === 1 ? 'ítem' : 'ítems'}`;

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <article className="sale-row">
      <button
        type="button"
        className="sale-row-main"
        onClick={() => navigate(`/ventas/${sale.id}`)}
      >
        <div className="sale-row-top">
          <div className="sale-row-time">{formatSaleTime(sale.createdAt)}</div>
          <div className="sale-row-total">{formatMoney(sale.total)}</div>
        </div>
        <div className="sale-row-products" title={productLine}>
          {productLine}
        </div>
        <div className="sale-row-meta">
          {sale.user ? `${sale.user.displayName} · ` : ''}
          {formatSaleDate(sale.createdAt)}
        </div>
      </button>

      <div className="sale-row-actions" ref={menuRef}>
        <button
          type="button"
          className="icon-btn sale-more-btn"
          aria-label="Opciones de venta"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span aria-hidden>⋯</span>
        </button>
        {menuOpen && (
          <div className="sale-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              className="sale-menu-item"
              onClick={() => {
                setMenuOpen(false);
                onEdit(sale);
              }}
            >
              <IconEdit size={16} /> Editar
            </button>
            <button
              type="button"
              role="menuitem"
              className="sale-menu-item is-danger"
              onClick={() => {
                setMenuOpen(false);
                onDelete(sale);
              }}
            >
              <IconTrash size={16} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
