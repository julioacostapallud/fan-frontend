import { http } from './httpClient';
import type {
  CreateSalePayload,
  Motif,
  Product,
  ProductStats,
  SaleDetail,
  SalesPage,
  StatsSummary,
} from './types';

export const api = {
  health: () => http.get<{ status: string }>('/health'),

  products: {
    list: (params?: { activeOnly?: boolean; q?: string }) => {
      const qs = new URLSearchParams();
      if (params?.activeOnly) qs.set('activeOnly', 'true');
      if (params?.q) qs.set('q', params.q);
      const q = qs.toString();
      return http.get<Product[]>(`/products${q ? `?${q}` : ''}`);
    },
    get: (id: string) => http.get<Product>(`/products/${id}`),
    create: (body: { name: string; defaultPrice: number }) =>
      http.post<Product>('/products', body),
    update: (
      id: string,
      body: Partial<{ name: string; defaultPrice: number; isActive: boolean }>,
    ) => http.patch<Product>(`/products/${id}`, body),
    motifs: (id: string) => http.get<Motif[]>(`/products/${id}/motifs`),
  },

  motifs: {
    search: (q: string) =>
      http.get<Motif[]>(`/motifs/search?q=${encodeURIComponent(q)}`),
  },

  sales: {
    list: (params?: { page?: number; limit?: number; from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      const q = qs.toString();
      return http.get<SalesPage>(`/sales${q ? `?${q}` : ''}`);
    },
    get: (id: string) => http.get<SaleDetail>(`/sales/${id}`),
    create: (body: CreateSalePayload, idempotencyKey: string) =>
      http.post<SaleDetail>('/sales', body, idempotencyKey),
    update: (id: string, body: CreateSalePayload) =>
      http.patch<SaleDetail>(`/sales/${id}`, body),
    remove: (id: string) => http.delete<{ id: string; deleted: boolean }>(`/sales/${id}`),
  },

  statistics: {
    summary: (from?: string, to?: string) => {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const q = qs.toString();
      return http.get<StatsSummary>(`/statistics/summary${q ? `?${q}` : ''}`);
    },
    products: (from?: string, to?: string) => {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const q = qs.toString();
      return http.get<ProductStats[]>(`/statistics/products${q ? `?${q}` : ''}`);
    },
  },
};
