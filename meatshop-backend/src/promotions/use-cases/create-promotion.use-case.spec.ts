import { jest } from '@jest/globals';
import { CreatePromotionUseCase } from './create-promotion.use-case';
import type { Promotion } from '../entities/promotion.entity';

describe('CreatePromotionUseCase', () => {
  function setup() {
    const dto = {
      unit_id: 6,
      product_id: 9,
      title: 'Test offer',
      discount_percentage: 10,
      starts_at: '2099-10-21T10:00:00Z',
      ends_at: '2099-10-22T10:00:00Z',
    };
    const promotions = {
      create: jest.fn(
        (value: unknown) => ({ id: 1, active: true, ...(value as object) }) as Promotion,
      ),
      save: jest.fn(async (value: Promotion) => value),
    };
    const units = { findOne: jest.fn(async () => ({ id: 6 })) };
    const products = { findOne: jest.fn(async () => ({ id: 9, unit_id: 6 })) };
    const authorization = { assertHasPermission: jest.fn(async () => undefined) };
    const notifier = { execute: jest.fn(async () => 0) };
    const useCase = new CreatePromotionUseCase(
      promotions as never,
      units as never,
      products as never,
      authorization as never,
      notifier as never,
    );
    return { useCase, dto, promotions, authorization, notifier };
  }

  it('saves the campaign before handing it to the eligibility-aware notifier', async () => {
    const { useCase, dto, promotions, notifier } = setup();
    const saved = await useCase.execute(dto, { id: 4 } as never);
    expect(notifier.execute).toHaveBeenCalledWith(saved);
    expect(promotions.save.mock.invocationCallOrder[0]).toBeLessThan(
      notifier.execute.mock.invocationCallOrder[0],
    );
  });

  it('does not announce a campaign that failed to save', async () => {
    const { useCase, dto, promotions, notifier } = setup();
    promotions.save.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(useCase.execute(dto, { id: 4 } as never)).rejects.toThrow('storage unavailable');
    expect(notifier.execute).not.toHaveBeenCalled();
  });

  it('keeps the saved campaign when notifying its audience fails', async () => {
    const { useCase, dto, notifier } = setup();
    notifier.execute.mockRejectedValueOnce(new Error('audience unavailable'));
    await expect(useCase.execute(dto, { id: 4 } as never)).resolves.toMatchObject({ id: 1 });
  });

  it('rejects invalid periods without saving or notifying', async () => {
    const { useCase, dto, promotions, notifier } = setup();
    await expect(
      useCase.execute({ ...dto, ends_at: dto.starts_at }, { id: 4 } as never),
    ).rejects.toThrow();
    expect(promotions.save).not.toHaveBeenCalled();
    expect(notifier.execute).not.toHaveBeenCalled();
  });

  it('rejects unauthorized creation before saving or notifying', async () => {
    const { useCase, dto, promotions, authorization, notifier } = setup();
    authorization.assertHasPermission.mockRejectedValueOnce(new Error('forbidden'));
    await expect(useCase.execute(dto, { id: 4 } as never)).rejects.toThrow('forbidden');
    expect(promotions.save).not.toHaveBeenCalled();
    expect(notifier.execute).not.toHaveBeenCalled();
  });
});
