/* global cy, describe, it */
describe('Address pin selection',()=>{
 it('opens near the CEP, confirms a pin and invalidates it when the address changes',()=>{
  cy.intercept('POST','**/geocoding/resolve',{statusCode:200,body:{zip_code:'01001-000',street:'Praça da Sé',neighborhood:'Sé',city:'São Paulo',state:'SP',latitude:-23.5504,longitude:-46.6339,precision:'POSTAL_CODE'}}).as('cep');
  cy.visit('/register');
  cy.get('#unit-zip-code').type('01001000');
  cy.contains('button','Buscar').click();cy.wait('@cep');
  cy.contains('button','Marcar entrada no mapa').click();
  cy.get('[role="dialog"]').should('be.visible');
  cy.get('.maplibregl-canvas',{timeout:20000}).should('exist').click(100,100);
  cy.contains('button','Confirmar ponto',{timeout:20000}).should('be.enabled').click();
  cy.contains('Ponto confirmado.').should('be.visible');
  cy.get('#unit-zip-code').clear().type('01310100');
  cy.contains('Ponto confirmado.').should('not.exist');
 });
});
