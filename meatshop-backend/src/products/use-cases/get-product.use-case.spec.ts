import { jest } from '@jest/globals';
import { GetProductUseCase } from './get-product.use-case';

describe('Public product detail', () => {
  it.each([
    { active: false, category: { active: true }, quantity: 10 },
    { active: true, category: { active: false }, quantity: 10 },
    { active: true, category: { active: true }, quantity: 0 },
  ])('rejects unavailable product %j', async (value) => {
    const images = { find: jest.fn() };
    const service = new GetProductUseCase(
      { findOne: async () => value } as never,
      { findOne: async () => ({ quantity: value.quantity }) } as never,
      images as never,
    );
    await expect(service.execute(1)).rejects.toThrow('Product not found');
    expect(images.find).not.toHaveBeenCalled();
  });
});
