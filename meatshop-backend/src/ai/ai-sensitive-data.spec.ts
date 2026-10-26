import { describe, expect, it } from '@jest/globals';
import { redactSensitiveText } from './ai-sensitive-data';

describe('redactSensitiveText', () => {
  it('removes e-mail, CPF and phone', () => {
    const sanitized = redactSensitiveText(
      'CPF 123.456.789-00, e-mail teste@example.com, fone (11) 91234-5678',
    );

    expect(sanitized).toBe(
      'CPF [CPF removido], e-mail [e-mail removido], fone [telefone removido]',
    );
  });

  it.each([
    ['Oi, meu nome é João Silva e quero picanha', 'João Silva'],
    ['me chamo maria, qual corte?', 'maria'],
    ['Sou o Pedro de Souza, como asso costela?', 'Pedro de Souza'],
    ['sou a Ana e quero fraldinha', 'Ana'],
  ])('removes an introduced name in "%s"', (text, name) => {
    const sanitized = redactSensitiveText(text);

    expect(sanitized).not.toContain(name);
    expect(sanitized).toContain('[nome removido]');
  });

  it.each([
    'sou o tipo que prefere contrafilé mal passado',
    'sou a favor de fraldinha na brasa',
    'me chamo Picanha nas horas vagas',
    'Sou o Contrafilé da turma',
    'quero 2 kg de picanha e 500 g de linguiça para 10 pessoas',
  ])('keeps cut names and quantities in "%s"', (text) => {
    expect(redactSensitiveText(text)).toBe(text);
  });

  it.each([
    ['entregar na Rua das Flores, 123 por favor', 'Rua das Flores, 123'],
    ['moro na Av. Paulista 1000', 'Av. Paulista 1000'],
    ['Avenida Brasil nº 45', 'Avenida Brasil nº 45'],
    ['fica na travessa São João, 12', 'travessa São João, 12'],
    ['Alameda Santos 200', 'Alameda Santos 200'],
    ['Rodovia Anhanguera 330', 'Rodovia Anhanguera 330'],
  ])('removes the street address in "%s"', (text, address) => {
    const sanitized = redactSensitiveText(text);

    expect(sanitized).not.toContain(address);
    expect(sanitized).toContain('[endereço removido]');
  });

  it.each(['CEP 01310-100', 'cep: 01310100', 'meu cep é 01310-100'])(
    'removes the postal code in "%s"',
    (text) => {
      const sanitized = redactSensitiveText(text);

      expect(sanitized).not.toContain('01310');
      expect(sanitized).toContain('[CEP removido]');
    },
  );
});
