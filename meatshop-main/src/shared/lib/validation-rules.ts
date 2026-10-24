export const BRAZILIAN_UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const;

export function normalizeCPF(value: string) {
  return value.replace(/[.\-\s]/g, '');
}

export function normalizeCNPJ(value: string) {
  return value.replace(/[./\-\s]/g, '').toUpperCase();
}

export function validateCPF(value: string) {
  const cpf = normalizeCPF(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let length = 9; length <= 10; length++) {
    const sum = [...cpf.slice(0, length)].reduce((total, digit, i) => total + Number(digit) * (length + 1 - i), 0);
    if (((sum * 10) % 11) % 10 !== Number(cpf[length])) return false;
  }
  return true;
}

export function validateCNPJ(value: string) {
  const cnpj = normalizeCNPJ(value);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  for (let length = 12; length <= 13; length++) {
    const sum = [...cnpj.slice(0, length)].reduce((total, digit, i) => total + (digit.charCodeAt(0) - 48) * ((length - i - 1) % 8 + 2), 0);
    const remainder = sum % 11;
    if ((remainder < 2 ? 0 : 11 - remainder) !== Number(cnpj[length])) return false;
  }
  return true;
}

export function validateEmail(value: string) {
  const email = value.trim();
  if (email.length > 254) return false;
  const parts = email.split('@');
  return parts.length === 2 && parts[0].length <= 64 && !parts[0].startsWith('.') && !parts[0].endsWith('.') && !parts[0].includes('..') && /^[^\s@]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(email) && !parts[1].includes('..');
}

export function validatePhone(value: string) {
  if (!/^\+?[\d()\s-]+$/.test(value)) return false;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  return /^[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(digits);
}

export function validateName(value: string) {
  const name = value.trim();
  return name.length >= 2 && name.length <= 100 && /^[\p{L}\p{M}][\p{L}\p{M} .’'-]*[\p{L}\p{M}.]$/u.test(name) && (name.match(/\p{L}/gu)?.length ?? 0) >= 2;
}

export function validateRG(value: string) {
  return /^[A-Z0-9]{5,14}$/.test(value.replace(/[.\-\s]/g, '').toUpperCase());
}

export function validateCNH(value: string) {
  const digits = value.replace(/[.\-\s]/g, '');
  return /^\d{11}$/.test(digits) && !/^(\d)\1{10}$/.test(digits);
}

export function validateUF(value: string) {
  return BRAZILIAN_UFS.some(uf => uf === value.trim().toUpperCase());
}

export function validateCEP(value: string) {
  return /^\d{8}$/.test(value.replace(/[-\s]/g, ''));
}

export function validatePassword(value: string) {
  return value.length >= 8 && value.length <= 64 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[\W_]/.test(value);
}

export function validateRequiredText(value: string, maximum = 150, minimum = 1) {
  const length = value.trim().length;
  return length >= minimum && length <= maximum;
}

export function validateDocument(value: string) {
  return validateCPF(value) || validateCNPJ(value);
}
