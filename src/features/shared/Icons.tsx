export function IconTrash({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconEdit({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5l3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconSun({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMoon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 14.5A7.5 7.5 0 0 1 9.5 4 7.2 7.2 0 0 0 8 4a8 8 0 1 0 12 10.5 7.2 7.2 0 0 0-.5-4.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Barras de señal 0–4 según intensidad de conexión. */
export function IconSignal({ size = 18, bars = 0 }: { size?: number; bars?: number }) {
  const levels = [0, 1, 2, 3] as const;
  const heights = [5, 9, 13, 17];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      {levels.map((i) => {
        const h = heights[i];
        const lit = i < bars;
        return (
          <rect
            key={i}
            x={4 + i * 5}
            y={20 - h}
            width="3.2"
            height={h}
            rx="1.2"
            fill="currentColor"
            opacity={lit ? 1 : 0.22}
          />
        );
      })}
    </svg>
  );
}
