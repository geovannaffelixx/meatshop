import { validateCPF, validateCNPJ, validateDocument, validateEmail, validateName, validatePassword, validatePhone, validateUF, validateCEP, validateRG, validateCNH } from './validators';
import { maskCNPJ, maskCPF, maskCEP, maskCPFOrCNPJ } from './input-masks';
import { isValidDate, formatDateValue, datetimeLocalToISO, toDatetimeLocal, isValidDateTime, validateDateRange, toDateInput } from './date-time';

describe('Shared form validation', () => {
  it.each(['529.982.247-25', '11144477735'])('accepts consistent CPF check digits: %s', value => expect(validateCPF(value)).toBe(true));
  it.each(['00000000000', '11111111111', '52998224726', 'abc52998224725'])('rejects invalid CPF: %s', value => expect(validateCPF(value)).toBe(false));
  it.each(['11.222.333/0001-81', '00.000.000/E08G-12', '00000000e08g12'])('accepts numeric and alphanumeric CNPJ: %s', value => expect(validateCNPJ(value)).toBe(true));
  it.each(['00000000000000', '11222333000182', '00.000.000/E08G-13', '11.222.333/0001-AB'])('rejects inconsistent CNPJ: %s', value => expect(validateCNPJ(value)).toBe(false));
  it('validates either document type without losing alphabetic characters', () => {
    expect(validateDocument('00.000.000/E08G-12')).toBe(true);
    expect(validateDocument('52998224725')).toBe(true);
    expect(maskCNPJ('00000000e08g12')).toBe('00.000.000/E08G-12');
    expect(maskCPFOrCNPJ('00000000e08g12')).toBe('00.000.000/E08G-12');
    expect(maskCPF('52998224725')).toBe('529.982.247-25');
    expect(maskCEP('75000000')).toBe('75000-000');
  });
  it.each(['João da Silva', 'Ana-Maria', "O’Connor", 'Li'])('accepts personal names: %s', value => expect(validateName(value)).toBe(true));
  it.each(['', '  ', '123', 'Maria123'])('rejects invalid personal names: %s', value => expect(validateName(value)).toBe(false));
  it('handles email, Brazilian phones, UF and postal codes independently from masks', () => {
    expect(validateEmail('gestor.330@meatshop.local')).toBe(true);
    expect(validateEmail('user@example.com ')).toBe(true);
    expect(validateEmail('user..name@example.com')).toBe(false);
    expect(validateEmail('user@invalid')).toBe(false);
    expect(validatePhone('(62) 99999-1234')).toBe(true);
    expect(validatePhone('+55 (62) 3333-1234')).toBe(true);
    expect(validatePhone('62999991234')).toBe(true);
    expect(validatePhone('6+2999991234')).toBe(false);
    expect(validatePhone('(00) 99999-1234')).toBe(false);
    expect(validateUF(' go ')).toBe(true);
    expect(validateUF('ZZ')).toBe(false);
    expect(validateCEP('75000-000')).toBe(true);
    expect(validateCEP('75000')).toBe(false);
    expect(validateRG('12.345.678-X')).toBe(true);
    expect(validateCNH('00000000000')).toBe(false);
  });
  it('enforces the existing password policy and maximum length', () => {
    expect(validatePassword('Senha123!')).toBe(true);
    expect(validatePassword('curta')).toBe(false);
    expect(validatePassword('Senha123!' + 'a'.repeat(60))).toBe(false);
  });
});

describe('Calendar dates and business timezone', () => {
  it('checks leap years and accepts valid future dates', () => {
    expect(isValidDate('29/02/2024')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('31/02/2026')).toBe(false);
    expect(isValidDate('2099-01-01')).toBe(true);
    expect(isValidDate('2026-13-01')).toBe(false);
  });
  it('preserves date-only values instead of shifting them to the previous day', () => {
    expect(formatDateValue('2026-10-23')).toBe('23/10/2026');
    expect(toDateInput('2026-10-23')).toBe('2026-10-23');
    expect(formatDateValue('invalid')).toBe('—');
  });
  it('round-trips a datetime input in Sao Paulo without changing the instant', () => {
    expect(toDatetimeLocal('2026-10-23T03:00:00Z')).toBe('2026-10-23T00:00');
    expect(datetimeLocalToISO('2026-10-23T00:00')).toBe('2026-10-23T03:00:00.000Z');
    expect(formatDateValue('2026-10-23T01:30:00Z')).toBe('22/10/2026');
  });
  it('rejects invalid times, impossible dates and inverted periods', () => {
    expect(isValidDateTime('2026-10-23T24:01')).toBe(false);
    expect(() => datetimeLocalToISO('2026-02-30T12:00')).toThrow();
    expect(validateDateRange('2026-10-23T12:00', '2026-10-23T13:00')).toBe(true);
    expect(validateDateRange('2026-10-23T13:00', '2026-10-23T12:00')).toBe(false);
    expect(validateDateRange('', '')).toBe(false);
  });
});
