import { describe, expect, it } from 'vitest';
import {
  BREAK_EVEN_REVENUE,
  RENT,
  buildEventModel,
  grossOf,
  netOf,
  toBusinessDayIso,
} from './eventModel';
import type { SaleListItem } from '../../../api/types';

function sale(at: string, total: number, product = 'Gorra', motif = 'Racing'): SaleListItem {
  return {
    id: at,
    createdAt: at,
    updatedAt: at,
    subtotal: String(total),
    generalDiscountType: 'NONE',
    generalDiscountValue: '0',
    generalDiscountAmount: '0',
    total: String(total),
    notes: null,
    lineCount: 1,
    totalUnits: 1,
    productSummary: [product],
    itemDiscountsTotal: '0',
    items: [
      {
        id: 'i',
        productId: 'p',
        motifId: 'm',
        quantity: 1,
        unitPrice: String(total),
        lineSubtotal: String(total),
        discountType: 'NONE',
        discountValue: '0',
        discountAmount: '0',
        lineTotal: String(total),
        product: { id: 'p', name: product },
        motif: { id: 'm', name: motif },
      },
    ],
  };
}

describe('event economics', () => {
  it('break-even revenue is rent / 0.6', () => {
    expect(BREAK_EVEN_REVENUE).toBeCloseTo(RENT / 0.6);
    expect(grossOf(10_000)).toBe(6000);
    expect(netOf(0)).toBe(-RENT);
  });
});

describe('business day assignment', () => {
  it('maps pre-6am to previous day', () => {
    expect(toBusinessDayIso(new Date('2026-07-19T05:30:00.000Z'))).toBe('2026-07-18');
  });
});

describe('buildEventModel', () => {
  it('builds 9 days and cumulative projection', () => {
    const now = new Date('2026-07-20T15:00:00.000Z'); // ~12:00 AR on 20th
    const model = buildEventModel(
      [
        sale('2026-07-18T15:00:00.000Z', 500_000),
        sale('2026-07-19T15:00:00.000Z', 600_000),
        sale('2026-07-20T14:00:00.000Z', 200_000),
      ],
      now,
    );
    expect(model.days).toHaveLength(9);
    expect(model.hourly).toHaveLength(9 * 24);
    expect(model.kpis.revenue).toBe(1_300_000);
    expect(model.kpis.projectedRevenue).toBeGreaterThan(model.kpis.revenue);
    expect(model.scenarios).toHaveLength(3);
    expect(model.products[0].name).toBe('Gorra');
  });

  it('stops real hourly curve at current hour and continues projected', () => {
    const now = new Date('2026-07-20T15:00:00.000Z'); // 12:00 AR → slot 6
    const model = buildEventModel(
      [
        sale('2026-07-18T15:00:00.000Z', 500_000),
        sale('2026-07-19T18:00:00.000Z', 400_000),
        sale('2026-07-19T20:00:00.000Z', 200_000),
        sale('2026-07-20T14:00:00.000Z', 200_000),
      ],
      now,
    );

    const todayHours = model.hourly.filter((h) => h.day === '2026-07-20');
    const withReal = todayHours.filter((h) => h.cumulativeReal != null);
    const withoutReal = todayHours.filter((h) => h.cumulativeReal == null);
    const pastProjected = model.hourly.filter(
      (h) => h.day < '2026-07-20' && h.cumulativeProjected != null,
    );

    expect(withReal.length).toBeGreaterThan(0);
    expect(withoutReal.length).toBeGreaterThan(0);
    expect(pastProjected).toHaveLength(0);
    expect(withReal[withReal.length - 1]?.cumulativeReal).toBe(1_300_000);
    expect(model.hourly[model.hourly.length - 1]?.cumulativeProjected).toBeCloseTo(
      model.kpis.projectedRevenue,
      0,
    );
  });
});

describe('businessHourSlot', () => {
  it('maps 12:00 AR to slot 6', async () => {
    const { businessHourSlot } = await import('./eventModel');
    expect(businessHourSlot(new Date('2026-07-20T15:00:00.000Z'))).toBe(6);
  });
});
