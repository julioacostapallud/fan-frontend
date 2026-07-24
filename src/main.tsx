import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/app.css';
import { HomePage } from './features/sales/HomePage';
import { AuthProvider } from './features/auth/AuthContext';
import { RequireAuth } from './features/auth/RequireAuth';
import { LoginPage } from './features/auth/LoginPage';

const StatisticsPage = lazy(() =>
  import('./features/statistics/StatisticsPage').then((m) => ({
    default: m.StatisticsPage,
  })),
);
const RestockPage = lazy(() =>
  import('./features/statistics/RestockPage').then((m) => ({
    default: m.RestockPage,
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <HomePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/ventas/:id"
                element={
                  <RequireAuth>
                    <SaleDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/estadisticas"
                element={
                  <RequireAuth>
                    <StatisticsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/reposicion"
                element={
                  <RequireAuth>
                    <RestockPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <AdminPage />
                  </RequireAuth>
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
