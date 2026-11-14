/* global cy, describe, it, beforeEach */
import { panel } from '../fixtures/panel';

const message = (id) => ({ id, sender_id: 1, message: `Mensagem histórica ${id}`,
  created_at: new Date().toISOString(), sender: { id: 1, name: 'Owner', global_role: 'USER' }, attachments: [] });
const ticket = { id: 8, user_id: 1, subject: 'Histórico de atendimento', description: 'Ajuda',
  status: 'OPEN', category: 'OTHER', priority: 'NORMAL', created_at: new Date().toISOString(),
  messages: [message(31), message(32)], messages_has_more: true, messages_next_before_id: 31 };

describe('Support conversation history', () => {
  beforeEach(() => panel());
  it('retains the cursor and draft on failure and merges older messages without duplication', () => {
    cy.intercept('GET', 'http://localhost:3001/support-tickets/8', ticket);
    let attempts = 0;
    cy.intercept('GET', 'http://localhost:3001/support-tickets/8/messages?before_id=31&limit=30', (req) => {
      attempts += 1;
      req.reply(attempts === 1 ? { statusCode: 503, body: { message: 'Indisponível' } } :
        { items: [message(1), message(30)], has_more: false, next_before_id: null });
    }).as('history');
    cy.visit('/support/8');
    cy.contains('Mensagem histórica 31').should('be.visible');
    cy.get('textarea').type('Minha resposta em elaboração');
    cy.contains('button', 'Carregar mensagens anteriores').click();
    cy.wait('@history');
    cy.get('textarea').should('have.value', 'Minha resposta em elaboração');
    cy.contains('button', 'Carregar mensagens anteriores').click();
    cy.wait('@history');
    cy.contains('Mensagem histórica 1').should('exist');
    cy.contains('Mensagem histórica 32').should('exist');
    cy.contains('button', 'Carregar mensagens anteriores').should('not.exist');
  });
});
