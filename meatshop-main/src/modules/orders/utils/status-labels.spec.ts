import { canCompletePickup, orderStatusLabel, paymentMethodLabel } from './status-labels';

describe('Order fulfilment labels', () => {
  it('distinguishes collection from delivery without changing persisted statuses', () => {
    expect(orderStatusLabel('READY', 'PICKUP')).toBe('Pronto para retirada');
    expect(orderStatusLabel('DELIVERED', 'PICKUP')).toBe('Retirado');
    expect(orderStatusLabel('DELIVERED', 'DELIVERY')).toBe('Entregue');
    expect(orderStatusLabel('PREPARING', 'PICKUP')).toBe('Em preparo');
  });
  it('describes counter card payments and never treats pending cash as paid', () => {
    expect(paymentMethodLabel('Card on Delivery', 'PICKUP')).toBe('Maquininha no balcão');
    expect(paymentMethodLabel('Cash', 'PICKUP')).toBe('Dinheiro');
    expect(canCompletePickup('PENDING')).toBe(false);
    expect(canCompletePickup('PAID')).toBe(true);
  });
});
