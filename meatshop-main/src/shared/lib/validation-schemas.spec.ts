import { accountSchema, validationSchemas } from './validation-schemas';

describe('Zod form schemas', () => {
  it('returns normalized account data and field errors before submission', () => {
    expect(accountSchema.parse({ name: ' Ana Silva ', email: ' ANA@example.com ' })).toEqual({ name: 'Ana Silva', email: 'ana@example.com' });
    const result = accountSchema.safeParse({ name: '123', email: 'invalid' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map(issue => issue.path[0])).toEqual(['name', 'email']);
  });
  it('rejects wrong input types without throwing and validates alphanumeric check digits', () => {
    expect(validationSchemas.cnpj.safeParse(null).success).toBe(false);
    expect(validationSchemas.cnpj.safeParse(123).success).toBe(false);
    expect(validationSchemas.cnpj.safeParse('00.000.000/e08g-12').success).toBe(true);
    expect(validationSchemas.cnpj.safeParse('00.000.000/E08G-13').success).toBe(false);
  });
});
