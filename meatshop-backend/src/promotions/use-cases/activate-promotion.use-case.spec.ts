import { jest } from '@jest/globals';
import type { Promotion } from '../entities/promotion.entity';
import { ActivatePromotionUseCase } from './activate-promotion.use-case';

describe('ActivatePromotionUseCase', () => {
  const user = { id: 20 } as never;

  it('notifies the eligible audience only on an inactive-to-active transition', async () => {
    const promotion = { id: 3, unit_id: 7, active: false } as Promotion;
    const repository = {
      findOne: jest.fn(async () => promotion),
      update: jest.fn(async () => ({ affected: 1 })),
      findOneByOrFail: jest.fn(async () => ({ ...promotion, active: true })),
    };
    const authorization = { assertHasPermission: jest.fn(async () => undefined) };
    const notifier = { execute: jest.fn(async () => 4) };
    const useCase = new ActivatePromotionUseCase(
      repository as never,
      authorization as never,
      notifier as never,
    );

    await expect(useCase.execute(3, user)).resolves.toMatchObject({ active: true });
    expect(repository.update).toHaveBeenCalledWith(
      { id: 3, active: false },
      { active: true, notification_sent_at: null },
    );
    expect(notifier.execute).toHaveBeenCalledWith(expect.objectContaining({ id: 3, active: true }));
  });

  it('does not notify again when the promotion is already active', async () => {
    const promotion = { id: 3, unit_id: 7, active: true } as Promotion;
    const repository = {
      findOne: jest.fn(async () => promotion),
      save: jest.fn(),
    };
    const authorization = { assertHasPermission: jest.fn(async () => undefined) };
    const notifier = { execute: jest.fn() };
    const useCase = new ActivatePromotionUseCase(
      repository as never,
      authorization as never,
      notifier as never,
    );

    await expect(useCase.execute(3, user)).resolves.toBe(promotion);
    expect(repository.save).not.toHaveBeenCalled();
    expect(notifier.execute).not.toHaveBeenCalled();
  });
});
