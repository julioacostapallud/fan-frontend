import { describe, expect, it } from 'vitest';
import { calculateLineItem, calculateSale, formatMoney } from './money';

describe('money calculator', () => {
  it('calcula totales visuales sin descuento', () => {
    const result = calculateSale({
      items: [
        {
          quantity: 2,
          unitPrice: 5000,
          discountType: 'NONE',
          discountValue: 0,
        },
      ],
      generalDiscountType: 'NONE',
      generalDiscountValue: 0,
    });
    expect(result.total.toString()).toBe('10000');
    expect(formatMoney(result.total)).toContain('10');
  });

  it('valida cantidad', () => {
    expect(() =>
      calculateLineItem({
        quantity: 0,
        unitPrice: 1000,
        discountType: 'NONE',
        discountValue: 0,
      }),
    ).toThrow(/cantidad/);
  });

  it('valida descuento mayor al importe', () => {
    expect(() =>
      calculateLineItem({
        quantity: 1,
        unitPrice: 1000,
        discountType: 'FIXED',
        discountValue: 2000,
      }),
    ).toThrow(/superar/);
  });

  it('permite modificar precio unitario en el cálculo', () => {
    const result = calculateLineItem({
      quantity: 1,
      unitPrice: 9999,
      discountType: 'NONE',
      discountValue: 0,
    });
    expect(result.lineTotal.toString()).toBe('9999');
  });
});
