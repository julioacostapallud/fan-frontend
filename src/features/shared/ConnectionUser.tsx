import { useAuth } from '../auth/AuthContext';
import { IconSignal } from './Icons';
import { useConnectionPulse } from './useConnectionPulse';

const QUALITY_LABEL: Record<string, string> = {
  offline: 'Sin conexión al servidor',
  poor: 'Conexión saturada / muy lenta',
  fair: 'Conexión lenta',
  good: 'Conexión estable',
  excellent: 'Conexión rápida',
};

/** Nombre de usuario + intensidad de red (ping periódico). */
export function ConnectionUser() {
  const { user } = useAuth();
  const pulse = useConnectionPulse(Boolean(user));

  const label = QUALITY_LABEL[pulse.quality] ?? QUALITY_LABEL.offline;
  const detail =
    pulse.latencyMs != null ? `${label} · ${pulse.latencyMs} ms` : label;

  return (
    <span
      className={`conn-user conn-${pulse.quality}${pulse.online ? ' is-online' : ''}`}
      title={detail}
      aria-label={detail}
    >
      <span className={`conn-signal conn-${pulse.quality}`} aria-hidden>
        <IconSignal size={16} bars={pulse.bars} />
      </span>
      <span className="app-header-username">{user?.displayName}</span>
    </span>
  );
}
