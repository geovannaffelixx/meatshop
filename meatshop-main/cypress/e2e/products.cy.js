/* global cy, describe, it, beforeEach, expect */
import { panel, product } from '../fixtures/panel';
describe('Product management', () => {
  beforeEach(() => panel());
  it('lists and creates a product with its real stock', () => {
    cy.intercept('POST', 'http://localhost:3001/products', (req) => { expect(req.body.name).to.eq('Carne nova'); req.reply({ id: 2 }); }).as('create');
    cy.intercept('PATCH', 'http://localhost:3001/products/2/stock', {}).as('stock');
    cy.visit('/products'); cy.contains('Picanha teste').should('be.visible');
    cy.contains('button', /Novo produto/).click();
    cy.get('input[placeholder="Ex.: Picanha bovina"]').type('Carne nova');
    cy.get('input[placeholder="Ex.: 25"]').clear().type('10');
    cy.get('input[placeholder="Ex.: 89,90"]').clear().type('40');
    cy.contains('button', /Salvar|Adicionar produto/).click(); cy.wait('@create');
  });
  it('activates a product through the existing PATCH flow', () => {
    cy.intercept('GET', 'http://localhost:3001/products/manage/1*', { product: { ...product, active: false }, stock: { quantity: 10, min_quantity: 1 }, images: [] });
    cy.intercept('GET', 'http://localhost:3001/products/1*', { product: { ...product, active: false }, stock: { quantity: 10, min_quantity: 1 }, images: [] });
    cy.intercept('PATCH', 'http://localhost:3001/products/1', (req) => { expect(req.body.active).to.eq(true); req.reply({ ...product, active: true }); }).as('activate');
    cy.intercept('PATCH', 'http://localhost:3001/products/1/stock', {});
    cy.visit('/products/1');
    cy.get('select').filter(':has(option[value="ATIVO"])').select('ATIVO');
    cy.contains('button', /Salvar/).click(); cy.wait('@activate');
  });
});
