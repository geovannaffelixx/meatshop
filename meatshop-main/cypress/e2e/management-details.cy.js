/* global cy, describe, it, beforeEach, expect */
import { panel, page, product } from '../fixtures/panel';

describe('Management dialogs', () => {
  beforeEach(() => { panel(); cy.viewport(390, 844); });
  function visibleAction(label) {
    cy.get('[role="dialog"]').contains('button', label).should('be.visible').then(button => {
      expect(button[0].getBoundingClientRect().bottom).to.be.at.most(844);
    });
  }

  it('opens and closes product details on mobile', () => {
    cy.intercept('GET', 'http://localhost:3001/products/manage/1', { product, stock: { quantity: 10, min_quantity: 1 }, images: [] });
    cy.visit('/products');
    cy.contains('td', 'Picanha teste').click();
    cy.get('[role="dialog"]').should('contain', 'Picanha teste').and('contain', 'Em estoque');
    visibleAction('Fechar');
    cy.get('[role="dialog"]').contains('button', 'Fechar').click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('shows the coupon history empty state without overflowing the footer', () => {
    cy.intercept('GET', 'http://localhost:3001/coupons?*', page([{ id: 1, code: 'TESTE10', name: 'Teste', discount_type: 'PERCENTAGE', discount_amount: 10, current_usage_count: 0, active: true, expires_at: '2029-01-01', allowed_units: [] }]));
    cy.intercept('GET', 'http://localhost:3001/coupons/1/redemptions', []);
    cy.visit('/coupons');
    cy.contains('button', 'Usos').click();
    cy.get('[role="dialog"]').should('contain', 'Utilizações de TESTE10').and('contain', 'Ainda não utilizado.');
    visibleAction('Fechar');
  });

  it('retains support input and exposes an error when submission fails', () => {
    cy.intercept('GET', 'http://localhost:3001/support-tickets/search*', { data: [], total: 0 });
    cy.intercept('POST', 'http://localhost:3001/support-tickets', { statusCode: 500, body: { message: 'Falha ao enviar chamado.' } }).as('create');
    cy.visit('/support');
    cy.contains('button', 'Novo chamado').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', 'Assunto').find('input').type('Ajuda com meu pedido');
      cy.contains('button', 'Enviar chamado').click();
    });
    cy.wait('@create');
    cy.get('[role="dialog"] [role="alert"]').should('be.visible').and('have.focus');
    cy.get('[role="dialog"]').contains('label', 'Assunto').find('input').should('have.value', 'Ajuda com meu pedido');
    visibleAction('Cancelar');
  });

  it('requires an available courier before assigning an order', () => {
    const verification = { required: false, verifiedAt: null, expiresAt: null, lockedUntil: null };
    cy.intercept('GET', 'http://localhost:3001/delivery/units/1/live', { unit: { id: 1, name: 'Unidade teste', latitude: null, longitude: null }, generatedAt: new Date().toISOString(), deliveries: [{ orderId: 90, status: 'READY', deliveryStatus: 'WAITING_DELIVERY_PERSON', orderDate: new Date().toISOString(), client: { id: 4, name: 'Cliente teste' }, destination: null, deliveryPerson: null, location: null, pickupVerification: verification, deliveryVerification: verification }] });
    cy.intercept('GET', 'http://localhost:3001/delivery/units/1/people', [{ deliveryPersonId: 3, membershipStatus: 'ACTIVE', profileStatus: 'ACTIVE', isOnline: true, activeOrderId: null, user: { id: 3, name: 'Luciana' }, vehicle: { type: 'MOTORCYCLE' } }]);
    cy.intercept('POST', 'http://localhost:3001/delivery/units/1/orders/90/assign', req => { expect(req.body).to.deep.equal({ deliveryPersonId: 3 }); req.reply({}); }).as('assign');
    cy.visit('/deliveries');
    cy.contains('button', 'Atribuir entregador').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('button', 'Atribuir pedido').should('be.disabled');
      cy.contains('label', 'Entregador').find('select').select('3');
      cy.contains('button', 'Atribuir pedido').click();
    });
    cy.wait('@assign');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('displays a masked CNPJ in unit settings', () => {
    cy.intercept('GET', 'http://localhost:3001/units/1/settings', { id: 1, name: 'Unidade teste', cnpj: '11222333000181', gallery_urls: [] });
    cy.intercept('GET', 'http://localhost:3001/units/1/business-hours', []);
    cy.visit('/settings/unit');
    cy.contains('label', 'CNPJ').find('input').should('have.value', '11.222.333/0001-81').and('be.disabled');
  });
});
