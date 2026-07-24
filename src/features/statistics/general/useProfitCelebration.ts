import { useEffect, useRef, useState } from 'react';
import { launchProfitFireworks } from './fireworks';

const STORAGE_KEY = 'fan-profit-celebrated-v1';
/** Duración de los fuegos artificiales */
const FIREWORKS_MS = 4000;

type Options = {
  /** Resultado neto actual. */
  net: number | null;
};

/**
 * Festejo SOLO si el resultado neto es mayor que cero.
 * Fuegos una vez por sesión; brillo permanente mientras net > 0.
 */
export function useProfitCelebration({ net }: Options) {
  const fired = useRef(false);
  const [burst, setBurst] = useState(false);
  const clearTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
    };
  }, []);

  useEffect(() => {
    if (fired.current) return;
    if (net == null || !(net > 0)) return;

    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }

    fired.current = true;
    const t = window.setTimeout(() => {
      setBurst(true);
      launchProfitFireworks(FIREWORKS_MS);
      clearTimer.current = window.setTimeout(() => setBurst(false), FIREWORKS_MS);
    }, 500);

    return () => window.clearTimeout(t);
  }, [net]);

  return { burst };
}
