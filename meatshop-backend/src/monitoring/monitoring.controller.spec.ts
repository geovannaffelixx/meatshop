import { jest } from '@jest/globals';
import { MonitoringController } from './monitoring.controller';

describe('Monitoring receiver', () => {
  const secret = 'x'.repeat(64);
  it('rejects unauthenticated alerts before querying users or notifying', async () => {
    const db = { query: jest.fn() };
    const notifications = { execute: jest.fn() };
    const receiver = new MonitoringController(
      { get: () => secret } as never,
      db as never,
      notifications as never,
    );
    await expect(receiver.receive('Bearer invalid', { alerts: [] })).rejects.toThrow();
    expect(db.query).not.toHaveBeenCalled();
    expect(notifications.execute).not.toHaveBeenCalled();
  });
  it('sends authenticated alerts to administrators only without push delivery', async () => {
    const notifications = { execute: jest.fn(async () => ({})) };
    const receiver = new MonitoringController(
      { get: () => secret } as never,
      { query: async () => [{ id: 1 }] } as never,
      notifications as never,
    );
    await receiver.receive(`Bearer ${secret}`, {
      alerts: [
        {
          status: 'firing',
          labels: { alertname: 'BackendUnavailable' },
          annotations: { summary: 'Check service' },
        },
      ],
    });
    expect(notifications.execute).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 1, type: 'SYSTEM' }),
      { push: false },
    );
  });
});
