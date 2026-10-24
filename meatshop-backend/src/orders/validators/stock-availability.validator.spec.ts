import { StockAvailabilityValidator } from './stock-availability.validator';

describe('Stock quote validation', () => {
  it('compares PostgreSQL numeric quantities numerically rather than lexicographically', async () => {
    const validator = new StockAvailabilityValidator({
      findOne: async () => ({ quantity: '100.000' }),
    } as never);
    await expect(
      validator.assertAvailable([
        { product_id: 1, product_name: 'Meat', quantity: '2.000' as unknown as number },
      ]),
    ).resolves.toBeUndefined();
  });
  it('rejects quantities above available stock', async () => {
    const validator = new StockAvailabilityValidator({
      findOne: async () => ({ quantity: '2.000' }),
    } as never);
    await expect(
      validator.assertAvailable([
        { product_id: 1, product_name: 'Meat', quantity: '10.000' as unknown as number },
      ]),
    ).rejects.toThrow('Insufficient stock');
  });
});
