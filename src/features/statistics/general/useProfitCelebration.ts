import { useEffect, useRef, useState } from 'react';
import { launchProfitFireworks } from './fireworks';

const STORAGE_KEY = 'fan-profit-celebrated-v1';
/** Duración de los fuegos artificiales */
const FIREWORKS_MS = 4000;
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
 * `burst` marca el pico corto de los fuegos; la iluminación fija va aparte.
 */
export function useProfitCelebration({ force = false, net }: Options) {
  const fired = useRef(false);
  const [burst, setBurst] = useState(false);
  const clearTimer = useRef<number | null>(null);

  const runCelebrate = () => {
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    setBurst(true);
    launchProfitFireworks(FIREWORKS_MS);
    clearTimer.current = window.setTimeout(() => setBurst(false), FIREWORKS_MS);
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

  return { burst };
}

export function replayProfitCelebration() {
  window.dispatchEvent(new Event(REPLAY_CELEBRATE_EVENT));
}
