/* global cy, describe, it, beforeEach, expect */
import { panel, page } from '../fixtures/panel';

describe('Catalog form dialogs', () => {
  beforeEach(() => {
    panel();
    cy.intercept('GET', 'http://localhost:3001/categories/manage*', page([]));
  });

  it('creates a category through its labelled form', () => {
    cy.intercept('GET', 'http://localhost:3001/categories/manage*', page([]));
    cy.intercept('POST', 'http://localhost:3001/categories', req => {
      expect(req.body).to.include({ name: 'Cortes especiais', unit_id: 1, active: true });
      req.reply({ id: 2, ...req.body });
    }).as('createCategory');
    cy.visit('/categories');
    cy.contains('button', 'Nova categoria').click();
    cy.get('[role="dialog"]').within(() => {
      cy.get('input[placeholder="Ex.: Cortes bovinos"]').should('be.focused').type('Cortes especiais');
      cy.screenshot('category-dialog-desktop');
      cy.contains('button', 'Criar categoria').click();
    });
    cy.wait('@createCategory');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('keeps promotion actions inside the mobile viewport', () => {
    cy.intercept('GET', 'http://localhost:3001/promotions/manage*', page([]));
    cy.viewport(390, 844);
    cy.visit('/promotions');
    cy.contains('button', 'Nova promoção').click();
    cy.get('[role="dialog"]').contains('button', 'Criar promoção').should('be.visible').then(button => {
      const rect = button[0].getBoundingClientRect();
      expect(rect.bottom).to.be.at.most(844);
      expect(rect.top).to.be.at.least(0);
    });
    cy.screenshot('promotion-dialog-mobile');
  });

  it('keeps the category form open and focuses the required name when submitted empty', () => {
    cy.visit('/categories');
    cy.contains('button', 'Nova categoria').click();
    cy.get('[role="dialog"]').contains('button', 'Criar categoria').click();
    cy.get('[role="dialog"] input[required]').should('be.focused').then(input => expect(input[0].validity.valueMissing).to.eq(true));
  });

  function openCoupon() {
    cy.intercept('GET', 'http://localhost:3001/coupons*', page([]));
    cy.viewport(390, 844);
    cy.visit('/coupons');
    cy.contains('button', 'Novo cupom').should('have.length', 1).click();
    cy.get('[role="dialog"]').within(() => {
      cy.get('input[placeholder="Ex.: BEMVINDO10"]').type('bemvindo10');
      cy.get('input[placeholder="Ex.: Boas-vindas"]').type('Boas-vindas');
      cy.get('input[placeholder="Ex.: 10"]').type('10');
      cy.get('input[type="datetime-local"]').first().type('2027-01-01T12:00');
      cy.get('input[type="datetime-local"]').last().type('2027-02-01T12:00');
      cy.contains('button', 'Criar cupom').should('be.visible');
    });
  }

  it('submits a unit coupon on mobile with the original payload and keeps actions visible', () => {
    cy.intercept('POST', 'http://localhost:3001/coupons', req => {
      expect(req.body).to.include({ code: 'BEMVINDO10', type: 'UNIT', unit_id: 1, discount_type: 'PERCENTAGE', discount_amount: 10, usage_limit_per_user: 1, active: true });
      req.reply({ id: 1, ...req.body });
    }).as('createCoupon');
    openCoupon();
    cy.screenshot('coupon-dialog-mobile');
    cy.document().then(document => expect(document.documentElement.scrollWidth).to.be.at.most(390));
    cy.get('[role="dialog"]').contains('button', 'Criar cupom').click();
    cy.wait('@createCoupon');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('preserves coupon input and focuses the error if saving fails', () => {
    cy.intercept('POST', 'http://localhost:3001/coupons', { statusCode: 409, body: { message: 'Este código já está em uso.' } }).as('rejectedCoupon');
    openCoupon();
    cy.get('[role="dialog"]').contains('button', 'Criar cupom').click();
    cy.wait('@rejectedCoupon');
    cy.get('[role="dialog"] [role="alert"]').should('be.visible').and('be.focused');
    cy.get('[role="dialog"] input[placeholder="Ex.: BEMVINDO10"]').should('have.value', 'BEMVINDO10');
    cy.get('[role="dialog"]').contains('button', 'Criar cupom').should('be.enabled');
  });
});
