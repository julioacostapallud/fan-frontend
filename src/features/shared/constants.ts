export const MAX_PROCESSED_IMAGE_BYTES = 409_600;
export const IMAGE_MAX_EDGE = 1280;
export const IMAGE_QUALITY = 0.7;
export const API_TIMEOUT_MS = 25_000;
export const BUSINESS_TZ = 'America/Argentina/Buenos_Aires';
/** Día operativo: 06:00 → 06:00 del día siguiente (AR). */
export const BUSINESS_DAY_START_HOUR = 6;

/** Economía del puesto (editable en un solo lugar). */
export const EVENT_ECONOMICS = {
  rentAmount: 2_500_000,
  grossMarginRate: 0.6,
} as const;

export const BUSINESS_DAY_MINUTES = 24 * 60;
