import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RegenerateDeliveryCodeUseCase } from './regenerate-delivery-code.use-case';

function setup(status = 'READY') {
  const order = {
    id: 9,
    client_id: 1,
    status,
    delivery_type: 'PICKUP',
    delivery_code_expires_at: new Date(),
  };
  const query = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: async () => order,
  };
  const save = jest.fn(async () => order);
  const manager = { getRepository: () => ({ createQueryBuilder: () => query }), save };
  const transaction = async (work: (m: typeof manager) => Promise<unknown>) => work(manager);
  const issue = jest.fn(() => '123456');
  const notifyCustomerOfDeliveryCode = jest.fn(async () => undefined);
  const assertOwnsOrder = jest.fn();
  const service = new RegenerateDeliveryCodeUseCase(
    { manager: { transaction } } as never,
    { issue } as never,
    { assertOwnsOrder } as never,
    { notifyCustomerOfDeliveryCode } as never,
  );
  return { service, query, issue, save, assertOwnsOrder, notifyCustomerOfDeliveryCode };
}

describe('Counter pickup code regeneration', () => {
  it('locks the ready order and authorizes its owner before rotating the code', async () => {
    const { service, query, assertOwnsOrder, save } = setup();
    await expect(service.execute(9, 'DELIVERY', { id: 1 } as never)).resolves.toMatchObject({
      code: '123456',
    });
    expect(query.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(assertOwnsOrder).toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
  });
  it.each(['PREPARING', 'PENDING', 'DELIVERED', 'CANCELLED'])(
    'does not issue a customer code for %s pickup',
    async (status) => {
      const { service, issue, save } = setup(status);
      await expect(service.execute(9, 'DELIVERY', { id: 1 } as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(issue).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    },
  );
  it('does not issue the customer code to unit staff or another customer', async () => {
    const { service, assertOwnsOrder, issue } = setup();
    assertOwnsOrder.mockImplementation(() => {
      throw new ForbiddenException();
    });
    await expect(service.execute(9, 'DELIVERY', { id: 2 } as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(issue).not.toHaveBeenCalled();
  });
});
