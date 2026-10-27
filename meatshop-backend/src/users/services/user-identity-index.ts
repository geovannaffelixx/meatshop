import { fieldEncryption } from '../../common/security/field-encryption';

type IdentityField = 'cpf' | 'phone';

function blindIndex(field: IdentityField, value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, '') ?? '';
  return digits ? fieldEncryption().blindIndex(`${field}:${digits}`) : null;
}

export function cpfBlindIndex(cpf: string | null | undefined): string | null {
  return blindIndex('cpf', cpf);
}

export function phoneBlindIndex(phone: string | null | undefined): string | null {
  return blindIndex('phone', phone);
}

export function applyIdentityIndexes(values: Record<string, unknown>): void {
  if ('cpf' in values) values.cpf_hash = cpfBlindIndex(values.cpf as string | null);
  if ('phone' in values) values.phone_hash = phoneBlindIndex(values.phone as string | null);
}
