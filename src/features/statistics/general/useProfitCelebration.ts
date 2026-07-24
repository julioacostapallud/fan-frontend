import { useEffect, useRef } from 'react';
import { launchProfitFireworks } from './fireworks';

const STORAGE_KEY = 'fan-profit-celebrated-v1';

type Options = {
  /** Si true, dispara siempre (vista de prueba). */
  force?: boolean;
  /** Resultado neto actual. */
  net: number | null;
};

/**
 * Festejo cuando el resultado neto supera 0.
 * En modo force (preview) dispara siempre al montar.
 */
export function useProfitCelebration({ force = false, net }: Options) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (force) {
      fired.current = true;
      const t = window.setTimeout(() => launchProfitFireworks(), 600);
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
    const t = window.setTimeout(() => launchProfitFireworks(), 500);
    return () => window.clearTimeout(t);
  }, [force, net]);
}
