import { beforeEach, jest } from '@jest/globals';
import { SendOrderStatusNotificationUseCase } from './send-order-status-notification.use-case';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import type { Order } from '../../orders/entities/order.entity';

describe('Order notification language', () => {
  const execute = jest.fn(async () => undefined);
  const service = new SendOrderStatusNotificationUseCase(
    { findOne: jest.fn(async () => ({ id: 2 })) } as never,
    { find: jest.fn(async () => [{ user_id: 3, local_role: 'OWNER' }]) } as never,
    { canAccessPanel: () => true, has: () => true } as never,
    { execute } as never,
  );
  const order = { id: 90, unit_id: 2, client_id: 4, total_amount: 1234.56 } as Order;
  beforeEach(() => {
    execute.mockClear();
  });

  it.each([
    [OrderStatus.PENDING, 'aguarda confirmação'],
    [OrderStatus.CONFIRMED, 'foi confirmado'],
    [OrderStatus.PREPARING, 'está sendo preparado'],
    [OrderStatus.READY, 'está pronto'],
    [OrderStatus.OUT_FOR_DELIVERY, 'saiu para entrega'],
    [OrderStatus.DELIVERED, 'foi entregue'],
    [OrderStatus.CANCELLED, 'foi cancelado'],
  ])('localizes customer status %s', async (status, label) => {
    await service.notifyCustomerOfStatusChange({ ...order, status } as Order);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Atualização do pedido',
        message: `Seu pedido #90 ${label}`,
      }),
    );
  });

  it('localizes the unit assignment while retaining the person and order', async () => {
    await service.notifyUnitOfDeliveryAssignment(order, 'Luciana');
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Entregador atribuído',
        message: 'Luciana retirará o pedido #90. Valide o código antes de liberar o pedido.',
        action_url: '/deliveries',
      }),
    );
  });

  it('formats new order totals in Brazilian currency', async () => {
    await service.notifyUnitOfNewOrder(order);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Novo pedido',
        message: `Pedido #90 recebido, no valor de ${Number(1234.56).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
      }),
    );
  });

  it('keeps confirmation secrets out of localized notifications', async () => {
    await service.notifyCustomerOfDeliveryCode(order, '654321');
    await service.notifyDeliveryPersonOfPickupCode(order, 5, '123456');
    const notifications = JSON.stringify(execute.mock.calls);
    expect(notifications).toContain('Código de confirmação da entrega');
    expect(notifications).toContain('Código de retirada do pedido');
    expect(notifications).not.toMatch(/654321|123456/);
  });
});
