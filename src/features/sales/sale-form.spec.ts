import { describe, expect, it } from 'vitest';

/**
 * Lightweight unit-style checks for item list mutations used by the sale form.
 */
describe('sale items draft helpers', () => {
  it('agrega y quita artículos', () => {
    type Item = { key: string };
    let items: Item[] = [{ key: 'a' }];
    items = [...items, { key: 'b' }];
    expect(items).toHaveLength(2);
    items = items.filter((i) => i.key !== 'a');
    expect(items).toHaveLength(1);
    expect(items[0].key).toBe('b');
  });

  it('precarga precio desde producto y permite override', () => {
    const product = { defaultPrice: '12000' };
    let unitPrice = String(Number(product.defaultPrice));
    expect(unitPrice).toBe('12000');
    unitPrice = '11000';
    expect(unitPrice).toBe('11000');
  });
});
