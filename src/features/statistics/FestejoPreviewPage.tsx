import { Button } from 'reactstrap';
import { AppHeader } from '../shared/AppHeader';
import { GeneralDashboard } from './general/GeneralDashboard';
import { launchProfitFireworks } from './general/fireworks';

/**
 * Réplica de Stats → General con datos reales.
 * Los fuegos se disparan siempre (para probar el festejo).
 * No enlazar desde el menú: es una sorpresa en preview.
 */
export function FestejoPreviewPage() {
  return (
    <div className="app-shell">
      <AppHeader />

      <div className="page-header">
        <h1 className="page-title">Stats ventas</h1>
        <Button
          type="button"
          className="btn-top-motifs ms-auto"
          onClick={() => launchProfitFireworks()}
        >
          🎉 Otra vez
        </Button>
      </div>

      <div className="festejo-preview-banner">
        Vista de prueba del festejo · datos reales · fuegos siempre activos
      </div>

      <div className="stats-tabs mb-3" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        <span className="nav-link active" style={{ pointerEvents: 'none' }}>
          General
        </span>
      </div>

      <GeneralDashboard forceCelebrate />
    </div>
  );
}
