import { EVENT_ECONOMICS } from '../../shared/constants';

export const RENT_AMOUNT = EVENT_ECONOMICS.rentAmount;
export const GROSS_MARGIN_RATE = EVENT_ECONOMICS.grossMarginRate;

/** Facturación necesaria para cubrir el alquiler (solo el 60% es ganancia). */
export function breakEvenRevenue(
  rent = RENT_AMOUNT,
  margin = GROSS_MARGIN_RATE,
): number {
  return rent / margin;
}

export function grossProfit(amount: number, margin = GROSS_MARGIN_RATE): number {
  return amount * margin;
}

export function netProfit(
  amount: number,
  rent = RENT_AMOUNT,
  margin = GROSS_MARGIN_RATE,
): number {
  return grossProfit(amount, margin) - rent;
}

export function rentCoveragePct(
  amount: number,
  rent = RENT_AMOUNT,
  margin = GROSS_MARGIN_RATE,
): number {
  const gross = grossProfit(amount, margin);
  if (rent <= 0) return 100;
  return Math.min(100, (gross / rent) * 100);
}

export function revenueNeededForBreakEven(
  amountSold: number,
  rent = RENT_AMOUNT,
  margin = GROSS_MARGIN_RATE,
): number {
  const target = breakEvenRevenue(rent, margin);
  return Math.max(0, target - amountSold);
}
