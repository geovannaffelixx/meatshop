import { sanitizePayload } from './sanitize-payload';

describe('sanitizePayload', () => {
  it('remove credenciais e mascara dados pessoais recursivamente', () => {
    expect(
      sanitizePayload({
        password: 'Segredo123!',
        token: 'jwt',
        cpf: '153.864.040-67',
        owner: { email: 'usuario@meatshop.com.br', cnpj: '12345678000199' },
      }),
    ).toEqual({
      password: '[REDACTED]',
      token: '[REDACTED]',
      cpf: '***4067',
      owner: { email: 'us***@meatshop.com.br', cnpj: '***0199' },
    });
  });

  it('limita strings extensas', () => {
    expect(String(sanitizePayload('a'.repeat(600)))).toContain('[TRUNCATED]');
  });
});
