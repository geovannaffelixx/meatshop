/* global jest, beforeEach */
import type { Repository } from 'typeorm';
import type { Unit } from '../../units/entities/unit.entity';
import type { BusinessHoursValidator } from '../validators/business-hours.validator';
import { CheckoutUnitPolicyService } from './checkout-unit-policy.service';

describe('checkout unit availability', () => {
  const findOneOrFail = jest.fn();
  const assertWithinBusinessHours = jest.fn();
  const policy = new CheckoutUnitPolicyService(
    { findOneOrFail } as unknown as Repository<Unit>,
    { assertWithinBusinessHours } as unknown as BusinessHoursValidator,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    findOneOrFail.mockResolvedValue({ is_active: true });
  });
  it('checks business hours for immediate orders and leaves scheduled validation to slots', async () => {
    await policy.assertAvailable([2, 2], false);
    expect(assertWithinBusinessHours).toHaveBeenCalledTimes(1);
    await policy.assertAvailable([2], true);
    expect(assertWithinBusinessHours).toHaveBeenCalledTimes(1);
  });
  it('rejects inactive units even for scheduled orders', async () => {
    findOneOrFail.mockResolvedValue({ is_active: false });
    await expect(policy.assertAvailable([2], true)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'UNIT_INACTIVE' }),
    });
  });
});
