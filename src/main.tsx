import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/app.css';
import { HomePage } from './features/sales/HomePage';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/ventas/:id" element={<SaleDetailPage />} />
            <Route path="/estadisticas" element={<StatisticsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
