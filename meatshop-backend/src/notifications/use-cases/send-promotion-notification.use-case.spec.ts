import { jest } from '@jest/globals';
import type { Promotion } from '../../promotions/entities/promotion.entity';
import { SendPromotionNotificationUseCase } from './send-promotion-notification.use-case';

describe('SendPromotionNotificationUseCase', () => {
  function setup() {
    const promotion = {
      id: 12,
      unit_id: 3,
      active: true,
      title: 'Offer',
      description: null,
      starts_at: new Date(Date.now() - 60000),
      ends_at: new Date(Date.now() + 60000),
    } as Promotion;
    const query = {
      innerJoin: jest.fn(),
      leftJoin: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      distinct: jest.fn(),
      getMany: jest.fn(async () => [{ id: 4 }, { id: 8 }]),
    };
    for (const method of [
      query.innerJoin,
      query.leftJoin,
      query.where,
      query.andWhere,
      query.distinct,
    ])
      method.mockReturnValue(query);
    const claim = {
      update: jest.fn(),
      set: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      execute: jest.fn(async () => ({ affected: 1 })),
    };
    for (const method of [claim.update, claim.set, claim.where, claim.andWhere])
      method.mockReturnValue(claim);
    const promotions = {
      createQueryBuilder: jest.fn(() => claim),
      find: jest.fn(async () => [promotion]),
    };
    const users = { createQueryBuilder: jest.fn(() => query) };
    const notifier = { execute: jest.fn(async (_dto: unknown) => ({})) };
    const useCase = new SendPromotionNotificationUseCase(
      users as never,
      notifier as never,
      promotions as never,
    );
    return { useCase, promotion, users, query, claim, promotions, notifier };
  }

  it('includes default preferences while excluding explicit opt-out', async () => {
    const { useCase, promotion, query, notifier } = setup();
    await expect(useCase.execute(promotion)).resolves.toBe(2);
    expect(query.leftJoin).toHaveBeenCalledTimes(1);
    expect(query.andWhere).toHaveBeenCalledWith(
      'COALESCE(preference.promotions_enabled, true) = true',
    );
    expect(query.innerJoin).toHaveBeenCalledWith(
      expect.anything(),
      'purchase',
      expect.stringContaining('purchase.unit_id = :unitId'),
      expect.objectContaining({ unitId: 3, delivered: 'DELIVERED' }),
    );
    expect(query.distinct).toHaveBeenCalledWith(true);
    expect(notifier.execute).toHaveBeenCalledTimes(2);
  });

  it.each(['future', 'expired', 'inactive'])('does not announce a %s campaign', async (state) => {
    const { useCase, promotion, users, promotions } = setup();
    if (state === 'future') promotion.starts_at = new Date(Date.now() + 60000);
    if (state === 'expired') promotion.ends_at = new Date(Date.now() - 60000);
    if (state === 'inactive') promotion.active = false;
    await expect(useCase.execute(promotion)).resolves.toBe(0);
    expect(users.createQueryBuilder).not.toHaveBeenCalled();
    expect(promotions.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('does not duplicate a campaign already claimed by another worker', async () => {
    const { useCase, promotion, claim, notifier } = setup();
    claim.execute.mockResolvedValueOnce({ affected: 0 });
    await expect(useCase.execute(promotion)).resolves.toBe(0);
    expect(notifier.execute).not.toHaveBeenCalled();
  });

  it('isolates recipient failure while notifying the remaining audience', async () => {
    const { useCase, promotion, notifier } = setup();
    notifier.execute.mockRejectedValueOnce(new Error('recipient unavailable'));
    await expect(useCase.execute(promotion)).resolves.toBe(1);
    expect(notifier.execute).toHaveBeenCalledTimes(2);
  });

  it('processes due campaigns through the same claim and eligibility rules', async () => {
    const { useCase, promotions, notifier } = setup();
    await useCase.sendDue();
    expect(promotions.find).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, where: expect.objectContaining({ active: true }) }),
    );
    expect(notifier.execute).toHaveBeenCalledTimes(2);
  });
});
