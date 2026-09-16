import { WsException } from '@nestjs/websockets';
import { describe, expect, it, jest } from '@jest/globals';
import { DeliveryGateway } from './delivery.gateway';

describe('DeliveryGateway room lifecycle', () => {
  const gateway = new DeliveryGateway(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('leaves the requested order room', async () => {
    const client = { leave: jest.fn(async () => undefined) };
    await expect(gateway.unsubscribeFromOrder(client as never, { orderId: 12 })).resolves.toEqual({
      orderId: 12,
    });
    expect(client.leave).toHaveBeenCalledWith('order:12');
  });

  it('rejects an invalid room identifier', async () => {
    await expect(
      gateway.unsubscribeFromOrder({ leave: jest.fn() } as never, {
        orderId: 0,
      }),
    ).rejects.toBeInstanceOf(WsException);
  });
});
