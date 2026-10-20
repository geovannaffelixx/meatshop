import { jest } from '@jest/globals';
import { MoreThanOrEqual } from 'typeorm';
import { GetDeliveryTrackingUseCase } from './get-delivery-tracking.use-case';

describe('Latest tracking visibility', () => {
  const consent = new Date('2026-09-27T12:00:00Z');
  function setup(changes: object = {}) {
    const tracking = { find: jest.fn(async () => []) };
    const order = {
      id: 1,
      client_id: 2,
      delivery_person_id: 3,
      status: 'READY',
      delivery_status: 'PICKUP',
      tracking_consent_at: consent,
      ...changes,
    };
    const service = new GetDeliveryTrackingUseCase(
      { findOne: async () => order } as never,
      tracking as never,
      { findOne: async () => ({ is_online: true, status: 'ACTIVE' }) } as never,
      {} as never,
    );
    return { service, tracking };
  }
  it('only reads the assigned courier points captured within the current consent session', async () => {
    const { service, tracking } = setup();
    await service.execute(1, { id: 2, is_active: true } as never);
    expect(tracking.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { order_id: 1, delivery_person_id: 3, created_at: MoreThanOrEqual(consent) },
      }),
    );
  });
  it.each([{ status: 'CANCELLED' }, { tracking_revoked_at: new Date() }])(
    'does not query locations after tracking ends: %p',
    async (changes) => {
      const { service, tracking } = setup(changes);
      expect(await service.execute(1, { id: 2, is_active: true } as never)).toEqual([]);
      expect(tracking.find).not.toHaveBeenCalled();
    },
  );
});
