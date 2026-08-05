import { http } from './httpClient';
import type {
  AuthUser,
  CreateSalePayload,
  EventDetail,
  EventEconomics,
  EventExpense,
  EventProduct,
  EventSummary,
  ImportableProduct,
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

  events: {
    list: () => http.get<EventSummary[]>('/events'),
    get: (id: string) => http.get<EventDetail>(`/events/${id}`),
    create: (body: { name: string; startDate: string; endDate: string }) =>
      http.post<EventDetail>('/events', body),
    update: (
      id: string,
      body: Partial<{ name: string; startDate: string; endDate: string }>,
    ) => http.patch<EventDetail>(`/events/${id}`, body),
    remove: (id: string) =>
      http.delete<{ id: string; deleted: boolean; salesDeleted: number }>(
        `/events/${id}`,
      ),
    expenses: {
      list: (eventId: string) =>
        http.get<EventExpense[]>(`/events/${eventId}/expenses`),
      create: (
        eventId: string,
        body: { amount: number; description: string; date?: string },
      ) => http.post<EventExpense>(`/events/${eventId}/expenses`, body),
      update: (
        eventId: string,
        expenseId: string,
        body: Partial<{ amount: number; description: string; date: string }>,
      ) =>
        http.patch<EventExpense>(
          `/events/${eventId}/expenses/${expenseId}`,
          body,
        ),
      remove: (eventId: string, expenseId: string) =>
        http.delete<{ id: string; deleted: boolean }>(
          `/events/${eventId}/expenses/${expenseId}`,
        ),
    },
    products: {
      list: (eventId: string) =>
        http.get<EventProduct[]>(`/events/${eventId}/products`),
      importable: (eventId: string) =>
        http.get<ImportableProduct[]>(`/events/${eventId}/products/importable`),
      upsert: (
        eventId: string,
        body: {
          productId?: string;
          name?: string;
          cost: number;
          price: number;
        },
      ) => http.post<EventProduct>(`/events/${eventId}/products`, body),
      update: (
        eventId: string,
        eventProductId: string,
        body: Partial<{ cost: number; price: number }>,
      ) =>
        http.patch<EventProduct>(
          `/events/${eventId}/products/${eventProductId}`,
          body,
        ),
    },
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
    list: (params: {
      eventId: string;
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
    }) => {
      const qs = new URLSearchParams();
      qs.set('eventId', params.eventId);
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      if (params.from) qs.set('from', params.from);
      if (params.to) qs.set('to', params.to);
      return http.get<SalesPage>(`/sales?${qs.toString()}`);
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
    sellers: (eventId: string, from?: string, to?: string) => {
      const qs = new URLSearchParams();
      qs.set('eventId', eventId);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      return http.get<SellersStats>(`/statistics/sellers?${qs.toString()}`);
    },
    days: (eventId: string) =>
      http.get<StatsDays>(`/statistics/days?eventId=${encodeURIComponent(eventId)}`),
    topMotifs: (eventId: string, limit = 10) =>
      http.get<TopMotifsByDay>(
        `/statistics/top-motifs?eventId=${encodeURIComponent(eventId)}&limit=${limit}`,
      ),
    dailyTotals: (eventId: string) =>
      http.get<DailyTotals>(
        `/statistics/daily-totals?eventId=${encodeURIComponent(eventId)}`,
      ),
    revenueProgress: (eventId: string) =>
      http.get<RevenueProgress>(
        `/statistics/revenue-progress?eventId=${encodeURIComponent(eventId)}`,
      ),
    economics: (eventId: string) =>
      http.get<EventEconomics>(
        `/statistics/economics?eventId=${encodeURIComponent(eventId)}`,
      ),
    restock: (eventId: string) =>
      http.get<RestockItem[]>(
        `/statistics/restock?eventId=${encodeURIComponent(eventId)}`,
      ),
    summary: (eventId: string, from?: string, to?: string) => {
      const qs = new URLSearchParams();
      qs.set('eventId', eventId);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      return http.get<StatsSummary>(`/statistics/summary?${qs.toString()}`);
    },
    products: (eventId: string, from?: string, to?: string) => {
      const qs = new URLSearchParams();
      qs.set('eventId', eventId);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      return http.get<ProductStats[]>(`/statistics/products?${qs.toString()}`);
    },
  },
};
