/* global cy, describe, it, expect */
import { panel } from '../fixtures/panel';

describe('Message panel layout', () => {
  for (const width of [1280, 390]) {
    it(`keeps compact pagination aligned at ${width}px`, () => {
      panel();
      cy.intercept('http://localhost:3001/socket.io/*', {statusCode:503});
      cy.viewport(width, 900);
      cy.intercept('GET', 'http://localhost:3001/orders?*', req => {
        const current = Number(req.query.page || 1);
        req.reply({ data: Array.from({ length: 10 }, (_, i) => ({ id: current * 10 + i, client_id: 2, client_name: `Cliente ${i}`, unit_id: 1, delivery_person_id: null, status: 'CONFIRMED', order_date: '2026-11-12T12:00:00Z' })), meta: { page: current, limit: 10, total: 86, totalPages: 9 } });
      }).as('orders');
      cy.intercept('GET', 'http://localhost:3001/orders/*/chat?*', { items: [], has_more: false, next_before_id: null });
      cy.intercept('PATCH', 'http://localhost:3001/orders/*/chat/read*', {});
      cy.visit('/chat');
      cy.wait('@orders');
      cy.get('nav[aria-label="Paginação"]').should('be.visible').within(() => {
        cy.get('button').should('have.length', 2).then(buttons => {
          expect(buttons[0].getBoundingClientRect().top).to.equal(buttons[1].getBoundingClientRect().top);
        });
        cy.get('[aria-label="Próxima página"]').click();
      });
      cy.wait('@orders').its('request.query.page').should('eq', '2');
      cy.get('nav[aria-label="Paginação"]').should('contain', 'Página 2 de 9');
      cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(width));
      if (width > 1000) {
        cy.contains('aside button', 'Cliente 0').click();
        cy.get('textarea').should('be.visible');
      }
      cy.screenshot(`chat-pagination-${width}`);
    });
  }

  for (const width of [1280,390]) {
    it(`shows customer and courier unread counts and reads only the opened channel at ${width}px`, () => {
      panel(); cy.viewport(width,900);
      cy.intercept('http://localhost:3001/socket.io/*', {statusCode:503});
      cy.intercept('GET','http://localhost:3001/orders?*', {data:[{id:42,client_name:'Ana',unit_id:1,delivery_person_id:7,delivery_person_name:'João',status:'CONFIRMED',order_date:'2026-11-12T12:00:00Z',chat_unread:{client:2,delivery:3}}],meta:{page:1,limit:10,total:1,totalPages:1}}).as('orders');
      cy.intercept('GET','http://localhost:3001/orders/42/chat?*',{items:[],has_more:false,next_before_id:null}).as('history');
      cy.intercept('PATCH','http://localhost:3001/orders/42/chat/read*',{}).as('read');
      cy.visit('/chat'); cy.wait('@orders');
      cy.get('@history.all').should('have.length',0);
      cy.get('[aria-label="2 mensagens não lidas do cliente no pedido 42"]').should('be.visible');
      cy.get('[aria-label="3 mensagens não lidas do entregador no pedido 42"]').should('be.visible').click();
      cy.wait('@read').its('request.query.participant_type').should('eq','UNIT_DELIVERY_PERSON');
      if (width < 1000) cy.get('[aria-label="Voltar para conversas"]').click();
      cy.get('[aria-label="3 mensagens não lidas do entregador no pedido 42"]').should('not.exist');
      cy.get('[aria-label="2 mensagens não lidas do cliente no pedido 42"]').should('be.visible');
      cy.screenshot(`chat-unread-${width}`);
      cy.get('[aria-label="2 mensagens não lidas do cliente no pedido 42"]').click();
      cy.wait('@read').its('request.query.participant_type').should('eq','UNIT');
      if (width < 1000) cy.get('[aria-label="Voltar para conversas"]').click();
      cy.get('[aria-label="2 mensagens não lidas do cliente no pedido 42"]').should('not.exist');
    });
  }
});
