/* global cy, describe, it */
import { panel } from '../fixtures/panel';
const fill = () => {
  cy.get('#login-email').type('owner@example.com');
  cy.get('#login-password').type('Password123!');
  cy.contains('button', /^Entrar$/).click();
};
describe('Login', () => {
  it('uses cookie authentication and opens the panel', () => {
    panel();
    cy.intercept('POST', 'http://localhost:3001/auth/login', { statusCode: 200, body: {} }).as('login');
    cy.visit('/login'); fill(); cy.wait('@login');
    cy.location('pathname').should('eq', '/dashboard');
  });
  it('reports invalid credentials', () => {
    cy.intercept('POST', 'http://localhost:3001/auth/login', { statusCode: 401, body: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } }).as('login');
    cy.visit('/login'); fill(); cy.wait('@login');
    cy.location('pathname').should('eq', '/login');
    cy.contains('button', /^Entrar$/).should('be.enabled');
    cy.get('[role="status"], [role="alert"]').should('be.visible');
  });
  it('reports the server lockout without navigating away', () => {
    cy.intercept('POST', 'http://localhost:3001/auth/login', { statusCode: 429, headers: { 'Retry-After': '60' },
      body: { code: 'ACCOUNT_LOCKED', retry_after_seconds: 60, locked_until: new Date(Date.now()+60000).toISOString() } }).as('login');
    cy.visit('/login'); fill(); cy.wait('@login');
    cy.location('pathname').should('eq', '/login');
    cy.get('[role="status"], [role="alert"]').should('be.visible');
  });
});
