import { jest } from '@jest/globals';
import { ProductsController } from './products.controller';

describe('Product catalog access', () => {
  it('always filters public catalog even when the caller requests inactive products', async () => {
    const list = { execute: jest.fn() };
    const controller = new ProductsController(
      {} as never,
      {} as never,
      {} as never,
      list as never,
      {} as never,
      {} as never,
    );
    await controller.list('7', undefined, 'false', 'false', '1', '50');
    expect(list.execute).toHaveBeenCalledWith(
      expect.objectContaining({ unitId: 7, active: true, available: true }),
    );
  });
  it('does not expose management data when unit permission is denied', async () => {
    const list = { execute: jest.fn() };
    const authorization = {
      assertHasPermission: jest.fn(async () => {
        throw new Error('forbidden');
      }),
    };
    const controller = new ProductsController(
      {} as never,
      {} as never,
      {} as never,
      list as never,
      {} as never,
      authorization as never,
    );
    await expect(
      controller.manage({ id: 2 } as never, { unit_id: 7, page: 1, limit: 10 }),
    ).rejects.toThrow('forbidden');
    expect(list.execute).not.toHaveBeenCalled();
  });
});
