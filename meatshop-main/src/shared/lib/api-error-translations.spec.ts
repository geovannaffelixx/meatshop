import { translateApiError } from './api-error-translations';

describe('API error translations', () => {
  it('tells the user how long the account stays locked', () => {
    expect(translateApiError({ statusCode: 429, code: 'ACCOUNT_LOCKED', retry_after_seconds: 600 }, 429)).toBe('Conta bloqueada temporariamente por excesso de tentativas. Tente novamente em 10 minutos.');
    expect(translateApiError({ statusCode: 429, code: 'ACCOUNT_LOCKED', retry_after_seconds: 30 }, 429)).toContain('em 1 minuto.');
  });

  it('falls back to a generic lockout message without retry information', () => {
    expect(translateApiError({ statusCode: 429, code: 'ACCOUNT_LOCKED' }, 429)).toContain('Tente novamente mais tarde.');
  });

  it('translates expired verification links and inactive units', () => {
    expect(translateApiError({ statusCode: 400, message: 'Invalid or expired verification token' }, 400)).toBe('O link é inválido ou expirou. Solicite um novo link.');
    expect(translateApiError({ statusCode: 409, code: 'UNIT_INACTIVE' }, 409)).toBe('Esta unidade está inativa no momento.');
  });
});
