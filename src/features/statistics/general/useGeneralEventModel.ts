import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../../../api/api';
import { buildEventModel } from './eventModel';

async function fetchAllSales() {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await api.sales.list({ page, limit: 50 });
    all.push(...res.data);
    totalPages = res.meta.totalPages;
    page += 1;
  } while (page <= totalPages);
  return all;
}

export function useGeneralEventModel() {
  const query = useQuery({
    queryKey: ['general-event-sales'],
    queryFn: fetchAllSales,
    staleTime: 30_000,
  });

  const model = useMemo(
    () => (query.data ? buildEventModel(query.data) : null),
    [query.data],
  );

  return { ...query, model };
}
