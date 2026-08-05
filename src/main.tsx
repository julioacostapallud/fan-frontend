import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Routes, Route, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/app.css';
import { EventsHomePage } from './features/events/EventsHomePage';
import { NewEventPage } from './features/events/NewEventPage';
import { EventLayout } from './features/events/EventLayout';
import { EventSalesPage } from './features/events/EventSalesPage';
import { EventExpensesPage } from './features/events/EventExpensesPage';
import { AuthProvider } from './features/auth/AuthContext';
import { RequireAuth } from './features/auth/RequireAuth';
import { LoginPage } from './features/auth/LoginPage';
import { ThemeProvider } from './features/shared/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from './api/api';
import { Spinner } from 'reactstrap';

const StatisticsPage = lazy(() =>
  import('./features/statistics/StatisticsPage').then((m) => ({
    default: m.StatisticsPage,
  })),
);
const AdminPage = lazy(() =>
  import('./features/products/AdminPage').then((m) => ({
    default: m.AdminPage,
  })),
);
const SaleDetailPage = lazy(() =>
  import('./features/sales/SaleDetailPage').then((m) => ({
    default: m.SaleDetailPage,
  })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return (
    <div className="app-shell">
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}

/** Compat: /ventas/:id → /eventos/:eventId/ventas/:id */
function LegacySaleRedirect() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ['sale', id],
    queryFn: () => api.sales.get(id!),
    enabled: Boolean(id),
  });
  if (query.isLoading) {
    return (
      <div className="app-shell text-center py-5">
        <Spinner />
      </div>
    );
  }
  if (!query.data?.eventId) {
    return <Navigate to="/" replace />;
  }
  return (
    <Navigate
      to={`/eventos/${query.data.eventId}/ventas/${query.data.id}`}
      replace
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <RequireAuth>
                      <EventsHomePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/eventos/nuevo"
                  element={
                    <RequireAuth>
                      <NewEventPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/eventos/:eventId"
                  element={
                    <RequireAuth>
                      <EventLayout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<EventSalesPage />} />
                  <Route path="estadisticas" element={<StatisticsPage />} />
                  <Route path="productos" element={<AdminPage />} />
                  <Route path="gastos" element={<EventExpensesPage />} />
                  <Route path="ventas/:saleId" element={<SaleDetailPage />} />
                </Route>
                <Route
                  path="/ventas/:id"
                  element={
                    <RequireAuth>
                      <LegacySaleRedirect />
                    </RequireAuth>
                  }
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
