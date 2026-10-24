import { sanitizePayload } from './sanitize-payload';

describe('sanitizePayload', () => {
  it('removes credentials and recursively masks personal data', () => {
    expect(
      sanitizePayload({
        password: 'Segredo123!',
        token: 'jwt',
        cpf: '153.864.040-67',
        owner: { email: 'user@meatshop.com.br', cnpj: '12345678000199' },
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

describe('Credential variants', () => {
  it('redacts SDK and HTTP credential variants', () => {
    const sanitized = sanitizePayload({
      accessToken: 'secret',
      refreshToken: 'secret',
      idToken: 'secret',
      api_key: 'secret',
      cookie: 'secret',
      nested: { authorization: 'secret' },
    });
    expect(JSON.stringify(sanitized)).not.toContain('secret');
  });
});
