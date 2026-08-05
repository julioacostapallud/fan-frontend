import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/api';
import { CONNECTION_PING_MS } from './constants';

export type ConnectionQuality = 'offline' | 'poor' | 'fair' | 'good' | 'excellent';

export type ConnectionPulse = {
  online: boolean;
  quality: ConnectionQuality;
  /** Última latencia medida en ms; null si offline / aún sin medición. */
  latencyMs: number | null;
  /** 0–4 barras para el ícono. */
  bars: number;
};

function qualityFromLatency(ms: number): ConnectionQuality {
  if (ms < 400) return 'excellent';
  if (ms < 900) return 'good';
  if (ms < 2000) return 'fair';
  return 'poor';
}

function barsFromQuality(q: ConnectionQuality): number {
  switch (q) {
    case 'excellent':
      return 4;
    case 'good':
      return 3;
    case 'fair':
      return 2;
    case 'poor':
      return 1;
    default:
      return 0;
  }
}

const OFFLINE: ConnectionPulse = {
  online: false,
  quality: 'offline',
  latencyMs: null,
  bars: 0,
};

/** Polling liviano a /health/ping midiendo RTT. */
export function useConnectionPulse(enabled = true): ConnectionPulse {
  const [pulse, setPulse] = useState<ConnectionPulse>(OFFLINE);
  const inFlight = useRef(false);

  const probe = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const started = performance.now();
    try {
      await api.ping();
      const latencyMs = Math.round(performance.now() - started);
      const quality = qualityFromLatency(latencyMs);
      setPulse({
        online: true,
        quality,
        latencyMs,
        bars: barsFromQuality(quality),
      });
    } catch {
      setPulse(OFFLINE);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const tick = () => {
      if (!cancelled) void probe();
    };

    tick();
    const id = window.setInterval(tick, CONNECTION_PING_MS);

    const onOnline = () => tick();
    const onOffline = () => setPulse(OFFLINE);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [enabled, probe]);

  return pulse;
}
