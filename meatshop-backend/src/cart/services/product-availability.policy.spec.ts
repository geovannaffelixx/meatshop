import { isValidProductQuantity, hasSufficientStock } from './product-availability.policy';

describe('Current product quantity policy', () => {
  it('rejects fractional historical quantities after a product changes to whole units', () => {
    expect(isValidProductQuantity({ unit_of_measure: 'UN' } as never, 1.5)).toBe(false);
    expect(isValidProductQuantity({ unit_of_measure: 'KG' } as never, 1.5)).toBe(true);
  });
  it('rejects non-finite or non-positive quantities', () => {
    for (const quantity of [NaN, Infinity, 0, -1]) {
      expect(isValidProductQuantity({ unit_of_measure: 'KG' } as never, quantity)).toBe(false);
      expect(hasSufficientStock(100, quantity)).toBe(false);
    }
  });
});
