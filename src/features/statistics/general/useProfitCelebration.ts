import { useEffect, useRef, useState } from 'react';
import { launchProfitFireworks } from './fireworks';

const STORAGE_KEY = 'fan-profit-celebrated-v1';
const CELEBRATE_MS = 7000;
export const REPLAY_CELEBRATE_EVENT = 'fan-replay-profit-celebrate';

type Options = {
  /** Si true, dispara siempre (vista de prueba). */
  force?: boolean;
  /** Resultado neto actual. */
  net: number | null;
};

/**
 * Festejo cuando el resultado neto supera 0.
 * En modo force (preview) dispara siempre al montar.
 * Devuelve `celebrating` para iluminar el KPI de neto.
 */
export function useProfitCelebration({ force = false, net }: Options) {
  const fired = useRef(false);
  const [celebrating, setCelebrating] = useState(false);
  const clearTimer = useRef<number | null>(null);

  const runCelebrate = () => {
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    setCelebrating(true);
    launchProfitFireworks(CELEBRATE_MS - 400);
    clearTimer.current = window.setTimeout(() => setCelebrating(false), CELEBRATE_MS);
  };

  useEffect(() => {
    const onReplay = () => runCelebrate();
    window.addEventListener(REPLAY_CELEBRATE_EVENT, onReplay);
    return () => {
      window.removeEventListener(REPLAY_CELEBRATE_EVENT, onReplay);
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
    };
  }, []);

  useEffect(() => {
    if (fired.current) return;

    if (force) {
      fired.current = true;
      const t = window.setTimeout(runCelebrate, 600);
      return () => window.clearTimeout(t);
    }
    if (net == null || !(net > 0)) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    fired.current = true;
    const t = window.setTimeout(runCelebrate, 500);
    return () => window.clearTimeout(t);
  }, [force, net]);

  return { celebrating };
}

export function replayProfitCelebration() {
  window.dispatchEvent(new Event(REPLAY_CELEBRATE_EVENT));
}
