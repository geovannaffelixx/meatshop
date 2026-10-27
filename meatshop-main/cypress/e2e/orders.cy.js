/* global cy, describe, it, beforeEach, expect */
import { panel, page } from '../fixtures/panel';
const order = { id: 7, client_id: 2, client_name: 'Cliente teste', unit_id: 1,
  status: 'PENDING', delivery_type: 'PICKUP', delivery_status: null, order_date: new Date().toISOString(),
  total_amount: 50, subtotal: 50, discount_amount: 0, delivery_fee: 0, payment_status: 'PENDING',
  payment: { method: 'Cash', status: 'PENDING', refunded_amount: 0, fee_amount: 0 },
  items: [{ id: 1, product_id: 1, product_name: 'Picanha teste', quantity: 1, unit_price: 50 }] };
describe('Order management', () => {
  beforeEach(() => { panel(); });
  it('lists orders, opens detail and confirms an offline order', () => {
    let status = 'PENDING';
    cy.intercept('GET', 'http://localhost:3001/orders?*', page([order]));
    cy.intercept('GET', 'http://localhost:3001/orders/7', (req) => req.reply({ ...order, status }));
    cy.intercept('PATCH', 'http://localhost:3001/orders/7/confirm', (req) => { status = 'CONFIRMED'; req.reply({}); }).as('confirm');
    cy.visit('/orders'); cy.contains('Cliente teste').should('be.visible');
    cy.visit('/orders/7'); cy.contains('button', /Confirmar/).click();
    cy.wait('@confirm'); cy.contains('Confirmado').should('be.visible');
  });
  it('requires and sends the cancellation reason', () => {
    cy.intercept('GET', 'http://localhost:3001/orders/7', order);
    cy.intercept('PATCH', 'http://localhost:3001/orders/7/cancel', (req) => {
      expect(req.body.reason).to.eq('Sem estoque na unidade'); req.reply({});
    }).as('cancel');
    cy.visit('/orders/7'); cy.contains('button', /Cancelar pedido/i).click();
    cy.get('[role="dialog"] textarea').type('Sem estoque na unidade');
    cy.get('[role="dialog"]').contains('button', /Confirmar|Cancelar pedido/).click();
    cy.wait('@cancel');
  });
});
