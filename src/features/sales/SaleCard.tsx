import { Link } from 'react-router-dom';
import type { SaleListItem } from '../../api/types';
import { formatMoney } from '../shared/money';
import { formatSaleDate, formatSaleTime } from '../shared/dates';

interface Props {
  sale: SaleListItem;
}

export function SaleCard({ sale }: Props) {
  const hasDiscounts =
    Number(sale.generalDiscountAmount) > 0 || Number(sale.itemDiscountsTotal) > 0;

  return (
    <Link to={`/ventas/${sale.id}`} className="sale-row">
      <div className="sale-row-top">
        <div>
          <div className="sale-row-time">{formatSaleTime(sale.createdAt)}</div>
          <div className="sale-row-meta">{formatSaleDate(sale.createdAt)}</div>
        </div>
        <div className="sale-row-total">{formatMoney(sale.total)}</div>
      </div>
      <div className="sale-row-meta">
        {sale.lineCount} {sale.lineCount === 1 ? 'artículo' : 'artículos'} ·{' '}
        {sale.totalUnits} {sale.totalUnits === 1 ? 'unidad' : 'unidades'}
      </div>
      <ul className="sale-row-products">
        {sale.productSummary.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {hasDiscounts && (
        <div className="sale-row-meta">
          Descuentos aplicados
          {Number(sale.itemDiscountsTotal) > 0 &&
            ` · ítems ${formatMoney(sale.itemDiscountsTotal)}`}
          {Number(sale.generalDiscountAmount) > 0 &&
            ` · general ${formatMoney(sale.generalDiscountAmount)}`}
        </div>
      )}
    </Link>
  );
}
