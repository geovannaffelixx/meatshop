import { jest } from '@jest/globals';
import { assertTrackingAccess, isTrackable } from './tracking-policy';
describe('Tracking access boundary', () => {
  const order = {
    id: 1,
    unit_id: 2,
    client_id: 3,
    delivery_person_id: 4,
    status: 'READY',
    delivery_status: 'PICKUP',
  } as never;
  const user = { id: 3, is_active: true } as never;
  it('allows only the customer of the order without unit membership', async () => {
    const permissions = { assertHasPermission: jest.fn() };
    await assertTrackingAccess(order, user, {} as never, permissions as never);
    expect(permissions.assertHasPermission).not.toHaveBeenCalled();
  });
  it('allows the assigned active autonomous courier', async () => {
    await expect(
      assertTrackingAccess(
        order,
        { id: 5, is_active: true } as never,
        { findOne: async () => ({ id: 4 }) } as never,
        {} as never,
      ),
    ).resolves.toBeUndefined();
  });
  it('does not grant access to other couriers merely because they belong to a unit', async () => {
    await expect(
      assertTrackingAccess(
        order,
        { id: 6, is_active: true } as never,
        { findOne: async () => ({ id: 9 }) } as never,
        {
          assertHasPermission: async () => {
            throw new Error('denied');
          },
        } as never,
      ),
    ).rejects.toThrow();
  });
  it('rejects disabled accounts including owners', async () => {
    await expect(
      assertTrackingAccess(order, { id: 3, is_active: false } as never, {} as never, {} as never),
    ).rejects.toThrow();
  });
  it.each(['CANCELLED', 'DELIVERED', 'PENDING'])(
    'does not track terminal or unready status %s',
    (status) => {
      expect(isTrackable({ ...(order as object), status } as never)).toBe(false);
    },
  );
});
