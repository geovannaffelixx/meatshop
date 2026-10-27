/* global cy, describe, it, beforeEach, expect */
import { panel, page, product } from '../fixtures/panel';
const promotion = { id: 1, unit_id: 1, product_id: 1, title: 'Oferta teste', discount_percentage: 10,
  promotional_price: null, active: true, starts_at: '2020-01-01T12:00:00Z', ends_at: '2099-01-01T12:00:00Z', product };
describe('Promotions', () => {
  beforeEach(() => { panel(); cy.intercept('GET', 'http://localhost:3001/promotions/manage*', page([promotion])); });
  it('creates a promotion using the selected unit and product', () => {
    cy.intercept('POST', 'http://localhost:3001/promotions', (req) => { expect(req.body.product_id).to.eq(1); req.reply({ ...promotion, id: 2 }); }).as('create');
    cy.visit('/promotions'); cy.contains('button', /Nova promo/).click();
    cy.get('[role="dialog"] select').first().select('1');
    cy.get('input[placeholder^="Ex.: Picanha em"]').type('Oferta nova');
    cy.get('input[placeholder="Ex.: 20"]').clear().type('10');
    cy.get('input[type="datetime-local"]').first().type('2026-11-01T12:00');
    cy.get('input[type="datetime-local"]').last().type('2026-11-02T12:00');
    cy.get('[role="dialog"]').contains('button', /Salvar|Criar/).click(); cy.wait('@create');
  });
  it('deactivates a promotion', () => {
    cy.intercept('PATCH', 'http://localhost:3001/promotions/1/deactivate', {}).as('toggle');
    cy.visit('/promotions'); cy.contains('Oferta teste').should('be.visible');
    cy.contains('button', /Desativar/).click(); cy.wait('@toggle');
  });
});
