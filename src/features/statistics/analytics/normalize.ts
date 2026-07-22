import type { SaleListItem } from '../../../api/types';
import { minutesIntoBusinessDay, toBusinessDayIso } from './businessDay';
import type { AnalyticsSale } from './types';

export function normalizeSale(sale: SaleListItem): AnalyticsSale {
  const createdAt = new Date(sale.createdAt);
  const businessDay = toBusinessDayIso(createdAt);
  const items = (sale.items ?? []).map((it) => ({
    productId: it.productId,
    productName: it.product?.name ?? '—',
    motifId: it.motifId,
    motifName: it.motif?.name ?? '—',
    quantity: it.quantity,
    lineTotal: Number(it.lineTotal),
  }));
  const units =
    sale.totalUnits ??
    items.reduce((s, i) => s + i.quantity, 0);

  return {
    id: sale.id,
    createdAt,
    businessDay,
    minutesIntoDay: minutesIntoBusinessDay(createdAt, businessDay),
    total: Number(sale.total),
    units,
    items,
  };
}

export function filterSales(
  sales: AnalyticsSale[],
  opts: {
    day?: string;
    rangeFrom?: string;
    rangeTo?: string;
    motifName?: string | null;
    productId?: string | null;
    maxMinutesExclusive?: number;
  },
): AnalyticsSale[] {
  return sales.filter((s) => {
    if (opts.day && s.businessDay !== opts.day) return false;
    if (opts.rangeFrom && s.businessDay < opts.rangeFrom) return false;
    if (opts.rangeTo && s.businessDay > opts.rangeTo) return false;
    if (opts.maxMinutesExclusive != null && s.minutesIntoDay >= opts.maxMinutesExclusive) {
      return false;
    }
    if (opts.productId) {
      if (!s.items.some((i) => i.productId === opts.productId)) return false;
    }
    if (opts.motifName) {
      if (!s.items.some((i) => i.motifName === opts.motifName)) return false;
    }
    return true;
  });
}

/** Recalcula total/units de una venta si hay filtro de producto/motivo (proporcional a líneas). */
export function saleMetricsForFilters(
  sale: AnalyticsSale,
  productId: string | null,
  motifName: string | null,
): { revenue: number; units: number; salesCount: number } {
  if (!productId && !motifName) {
    return { revenue: sale.total, units: sale.units, salesCount: 1 };
  }
  const lines = sale.items.filter((i) => {
    if (productId && i.productId !== productId) return false;
    if (motifName && i.motifName !== motifName) return false;
    return true;
  });
  if (!lines.length) return { revenue: 0, units: 0, salesCount: 0 };
  return {
    revenue: lines.reduce((s, i) => s + i.lineTotal, 0),
    units: lines.reduce((s, i) => s + i.quantity, 0),
    salesCount: 1,
  };
}
