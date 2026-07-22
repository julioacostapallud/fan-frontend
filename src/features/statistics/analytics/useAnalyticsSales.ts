import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../../../api/api';
import type { SaleListItem } from '../../../api/types';
import { normalizeSale } from './normalize';
import type { AnalyticsSale } from './types';

async function fetchAllSales(): Promise<SaleListItem[]> {
  const all: SaleListItem[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await api.sales.list({ page, limit: 200 });
    all.push(...res.data);
    totalPages = res.meta.totalPages;
    page += 1;
  } while (page <= totalPages);
  return all;
}

export function useAnalyticsSales() {
  const query = useQuery({
    queryKey: ['analytics-sales-all'],
    queryFn: fetchAllSales,
    staleTime: 60_000,
  });

  const sales: AnalyticsSale[] = useMemo(
    () => (query.data ?? []).map(normalizeSale),
    [query.data],
  );

  return { ...query, sales };
}
