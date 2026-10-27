/* global cy, describe, it, expect */
import { panel } from '../fixtures/panel';

function contrastOnWhite(document, color) {
  const context = document.createElement('canvas').getContext('2d');
  context.fillStyle = color;
  context.fillRect(0,0,1,1);
  const rgb = [...context.getImageData(0,0,1,1).data].slice(0,3).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] + 0.05);
}
describe('Panel accessibility', () => {
  it('has one main landmark, a working skip link and labelled required product controls', () => {
    panel(); cy.visit('/products/new');
    cy.get('main').should('have.length',1);
    cy.get('a[href="#main-content"]').should('exist');
    cy.get('#main-content').should('have.attr','tabindex','-1');
    cy.get('main [required]').each((element) => {
      expect(element.attr('aria-labelledby') || element.attr('aria-label') || element.attr('id')).to.be.a('string');
    });
    cy.window().then((window) => {
      cy.get('main input[placeholder], main textarea[placeholder]').each((element) => {
        const color = window.getComputedStyle(element[0],'::placeholder').color;
        expect(contrastOnWhite(window.document,color)).to.be.at.least(4.5);
      });
      cy.get('main label, main legend, main p').each((element) => {
        expect(parseFloat(window.getComputedStyle(element[0]).fontSize)).to.be.at.least(12);
      });
    });
    cy.viewport(390,844);
    cy.document().then((document) => expect(document.documentElement.scrollWidth).to.be.at.most(390));
    cy.screenshot('product-mobile-accessibility',{capture:'fullPage'});
  });
});
