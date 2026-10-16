import { getNextAction } from './status-transitions';

describe('order status actions', () => {
  it('does not bypass pickup or delivery code validation', () => {
    expect(getNextAction('READY', 'DELIVERY')).toBeNull();
    expect(getNextAction('OUT_FOR_DELIVERY', 'DELIVERY')).toBeNull();
  });
  it('preserves preparation and customer pickup actions', () => {
    expect(getNextAction('PREPARING', 'DELIVERY')?.targetStatus).toBe('READY');
    expect(getNextAction('READY', 'PICKUP')?.targetStatus).toBe('DELIVERED');
  });
});
