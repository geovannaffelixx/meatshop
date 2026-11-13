/* global cy, describe, it, expect */
import { panel } from '../fixtures/panel';

describe('Counter pickup in the unit panel', () => {
  it('shows pickup status in chat without waiting for a courier', () => {
    panel(); cy.viewport(1280, 900);
    cy.intercept('http://localhost:3001/socket.io/*', { statusCode: 503 });
    cy.intercept('GET', 'http://localhost:3001/orders?*', {
      data: [{ id: 7, unit_id: 1, client_id: 2, client_name: 'Cliente retirada', status: 'READY', delivery_type: 'PICKUP', delivery_person_id: null, order_date: '2026-11-12T12:00:00Z' }],
      meta: { total: 1, totalPages: 1, page: 1, limit: 10 },
    }).as('orders');
    cy.intercept('GET', 'http://localhost:3001/orders/7/chat?*', { items: [], has_more: false });
    cy.intercept('PATCH', 'http://localhost:3001/orders/7/chat/read*', {});
    cy.visit('/chat'); cy.wait('@orders');
    cy.contains('Pronto para retirada').should('be.visible');
    cy.contains('aside button', 'Cliente retirada').click();
    cy.contains('Retirada no balcão · conversa com o cliente').should('be.visible');
    cy.contains('button', 'Entregador').should('not.exist');
    cy.contains('Disponível após atribuição do entregador').should('not.exist');
  });
  for (const width of [1280, 390]) {
    it(`records receipt then validates the customer code at ${width}px`, () => {
      panel(); cy.viewport(width, 1000);
      let status = 'READY'; let payment = 'PENDING';
      const order = () => ({ id: 7, client_id: 2, client_name: 'Cliente teste', unit_id: 1,
        status, delivery_type: 'PICKUP', delivery_status: null, order_date: '2026-11-12T12:00:00Z',
        total_amount: 50, subtotal: 50, discount_amount: 0, delivery_fee: 0, payment_status: payment,
        payment: { method: 'Cash', status: payment, refunded_amount: 0, fee_amount: 0 },
        items: [{ id: 1, product_id: 1, product_name: 'Picanha teste', quantity: 1, unit_price: 50 }] });
      cy.intercept('GET', 'http://localhost:3001/orders/7', req => req.reply(order())).as('order');
      cy.intercept('GET', 'http://localhost:3001/payments/orders/7/history', { refunds: [], manual_events: [], transactions: [] });
      cy.intercept('POST', 'http://localhost:3001/payments/orders/7/receipt', req => {
        expect(req.body.amount).to.eq(50); payment = 'PAID'; req.reply({ status: 'PAID' });
      }).as('receipt');
      cy.intercept('PATCH', 'http://localhost:3001/orders/7/status', req => {
        expect(req.body.status).to.eq('DELIVERED');
        if (req.body.code !== '123456') req.reply({ statusCode: 400, body: { code: 'INVALID_DELIVERY_CODE', message: 'Invalid security code.' } });
        else { status = 'DELIVERED'; req.reply({ status }); }
      }).as('complete');
      cy.visit('/orders/7'); cy.wait('@order');
      cy.contains('Pronto para retirada').should('be.visible');
      cy.contains('button', 'Validar código e confirmar retirada').should('be.disabled');
      cy.contains('button', 'Registrar recebimento').click();
      cy.contains('label', 'Referência / comprovante').find('input').type('Dinheiro recebido no balcão');
      cy.contains('button', 'Confirmar registro').click(); cy.wait('@receipt'); cy.wait('@order');
      cy.get('#counter-pickup-code').type('000000');
      cy.contains('button', 'Validar código e confirmar retirada').click(); cy.wait('@complete');
      cy.get('section[aria-labelledby="counter-pickup-title"] [role="alert"]').should('contain', 'Código incorreto');
      cy.get('#counter-pickup-code').clear().type('123456');
      cy.contains('button', 'Validar código e confirmar retirada').click(); cy.wait('@complete'); cy.wait('@order');
      cy.contains('Retirado').should('be.visible');
      cy.get('#counter-pickup-code').should('not.exist');
      cy.contains('Abrir entregas').should('not.exist');
      cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(width));
      cy.screenshot(`counter-pickup-completed-${width}`);
    });
  }
});
