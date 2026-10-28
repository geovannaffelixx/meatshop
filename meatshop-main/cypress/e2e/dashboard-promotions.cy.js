/* global cy, describe, it, beforeEach, expect */
import { panel } from '../fixtures/panel';

describe('Dashboard active promotions', () => {
  beforeEach(() => {
    panel();
    cy.intercept('GET', 'http://localhost:3001/dashboard*', { revenueThisMonth: 0, weeklyChart: { series: [] }, recentOrders: [], pendingOrdersCount: 0, lowStockCount: 0, topProducts: [] });
  });

  it('requests current unit campaigns and shows percentage and fixed-price savings', () => {
    cy.intercept('GET', 'http://localhost:3001/promotions/manage*', req => {
      const query = new URL(req.url).searchParams;
      expect(query.get('unit_id')).to.eq('1');
      expect(query.get('status')).to.eq('Ativa');
      expect(query.get('paginated')).to.eq('true');
      req.reply({ data: [
        { id: 1, title: 'Festival da picanha', discount_percentage: '10', promotional_price: null, product: { name: 'Picanha', price: '100', image_url: null } },
        { id: 2, title: 'Oferta do churrasco', discount_percentage: null, promotional_price: '65.37', product: { name: 'Chorizo', price: '80', image_url: null } },
      ], meta: { total: 12 } });
    }).as('promotions');
    cy.visit('/dashboard');
    cy.wait('@promotions');
    cy.contains('Nenhuma promoção ativa no momento.').should('not.exist');
    cy.contains('Festival da picanha').should('exist');
    cy.contains('Economize R$ 10,00').should('exist');
    cy.contains('Economize R$ 14,63').should('exist');
    cy.contains('p', 'Promoções ativas').parent().find('strong').should('have.text', '12');
  });

  it('shows the empty state only for a successful empty response', () => {
    cy.intercept('GET', 'http://localhost:3001/promotions/manage*', { data: [], meta: { total: 0 } });
    cy.visit('/dashboard');
    cy.contains('Nenhuma promoção ativa no momento.').should('be.visible');
  });

  it('distinguishes a failed request from an empty list', () => {
    cy.intercept('GET', 'http://localhost:3001/promotions/manage*', { statusCode: 403, body: { message: 'Sem acesso às promoções.' } });
    cy.visit('/dashboard');
    cy.contains('Sem acesso às promoções.').should('be.visible');
    cy.contains('Nenhuma promoção ativa no momento.').should('not.exist');
  });
});
