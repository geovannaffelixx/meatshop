import { jest } from '@jest/globals';
import type { Promotion } from '../entities/promotion.entity';
import { ActivatePromotionUseCase } from './activate-promotion.use-case';

describe('ActivatePromotionUseCase', () => {
  const user = { id: 20 } as never;

  it('notifies the eligible audience only on an inactive-to-active transition', async () => {
    const promotion = { id: 3, unit_id: 7, active: false } as Promotion;
    const repository = {
      findOne: jest.fn(async () => promotion),
      save: jest.fn(async (value: Promotion) => value),
    };
    const authorization = { assertHasPermission: jest.fn(async () => undefined) };
    const notifier = { execute: jest.fn(async () => 4) };
    const useCase = new ActivatePromotionUseCase(
      repository as never,
      authorization as never,
      notifier as never,
    );

    await expect(useCase.execute(3, user)).resolves.toMatchObject({ active: true });
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(notifier.execute).toHaveBeenCalledWith(promotion);
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
