import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../../../api/api';
import { eachIsoDay } from '../../shared/dates';
import { buildEventModel } from './eventModel';

async function fetchAllSales(eventId: string) {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await api.sales.list({ eventId, page, limit: 50 });
    all.push(...res.data);
    totalPages = res.meta.totalPages;
    page += 1;
  } while (page <= totalPages);
  return all;
}

export function useGeneralEventModel(eventId: string) {
  const salesQuery = useQuery({
    queryKey: ['general-event-sales', eventId],
    queryFn: () => fetchAllSales(eventId),
    staleTime: 30_000,
    enabled: Boolean(eventId),
  });

  const economicsQuery = useQuery({
    queryKey: ['event-economics', eventId],
    queryFn: () => api.statistics.economics(eventId),
    staleTime: 30_000,
    enabled: Boolean(eventId),
  });

  const model = useMemo(() => {
    if (!salesQuery.data || !economicsQuery.data) return null;
    const { eventStart, eventEnd, expensesTotal, contribution, revenue } =
      economicsQuery.data;
    const businessDays = eachIsoDay(eventStart, eventEnd);
    const rev = Number(revenue);
    const contrib = Number(contribution);
    const marginRate = rev > 0 ? Math.min(0.95, Math.max(0.05, contrib / rev)) : 0.6;
    return buildEventModel(salesQuery.data, {
      businessDays,
      expensesTotal: Number(expensesTotal),
      marginRate,
      contributionNow: contrib,
    });
  }, [salesQuery.data, economicsQuery.data]);

  return {
    model,
    isLoading: salesQuery.isLoading || economicsQuery.isLoading,
    error: salesQuery.error || economicsQuery.error,
    refetch: () => {
      void salesQuery.refetch();
      void economicsQuery.refetch();
    },
  };
}
