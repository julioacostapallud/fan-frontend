import { http } from './httpClient';
import type {
  AuthUser,
  CreateSalePayload,
  LoginResponse,
  Motif,
  Product,
  ProductStats,
  RestockItem,
  SaleDetail,
  SalesPage,
  SellersStats,
  StatsDays,
  StatsSummary,
  TopMotifsByDay,
  DailyTotals,
  RevenueProgress,
} from './types';

export const api = {
  health: () => http.get<{ status: string }>('/health'),

  auth: {
    login: (username: string, password: string) =>
      http.post<LoginResponse>('/auth/login', { username, password }, undefined, false),
    me: () => http.get<AuthUser>('/auth/me'),
  },

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
    search: (q: string, productId?: string) => {
      const qs = new URLSearchParams();
      if (q) qs.set('q', q);
      if (productId) qs.set('productId', productId);
      const query = qs.toString();
      return http.get<Motif[]>(`/motifs/search${query ? `?${query}` : ''}`);
    },
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
    remove: (id: string) =>
      http.delete<{ id: string; deleted: boolean }>(`/sales/${id}`),
  },

  statistics: {
    sellers: (from?: string, to?: string) => {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const q = qs.toString();
      return http.get<SellersStats>(`/statistics/sellers${q ? `?${q}` : ''}`);
    },
    days: () => http.get<StatsDays>('/statistics/days'),
    topMotifs: (limit = 10) =>
      http.get<TopMotifsByDay>(`/statistics/top-motifs?limit=${limit}`),
    dailyTotals: () => http.get<DailyTotals>('/statistics/daily-totals'),
    revenueProgress: () => http.get<RevenueProgress>('/statistics/revenue-progress'),
    restock: () => http.get<RestockItem[]>('/statistics/restock'),
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
