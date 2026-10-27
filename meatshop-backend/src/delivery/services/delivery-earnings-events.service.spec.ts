/* global jest */
import type { DataSource } from 'typeorm';
import type { DeliveryGateway } from '../delivery.gateway';
import { DeliveryEarningsEventsService } from './delivery-earnings-events.service';

it('emits earnings updates only to the assigned user room and acknowledges the outbox event', async () => {
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));
  const query = jest
    .fn()
    .mockResolvedValueOnce([{ id: '3', order_id: 12, user_id: 7 }])
    .mockResolvedValue([]);
  const db = {
    transaction: async (work: (manager: { query: typeof query }) => Promise<void>) =>
      work({ query }),
  };
  const service = new DeliveryEarningsEventsService(
    db as unknown as DataSource,
    { server: { to } } as unknown as DeliveryGateway,
  );
  await service.dispatch();
  expect(to).toHaveBeenCalledWith('user:7');
  expect(emit).toHaveBeenCalledWith('delivery:earnings.updated', { orderId: 12 });
  expect(query).toHaveBeenLastCalledWith('DELETE FROM delivery_earnings_events WHERE id=$1', ['3']);
});
