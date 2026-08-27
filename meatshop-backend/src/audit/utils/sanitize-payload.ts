const SENSITIVE_KEYS = [
  'password',
  'password_hash',
  'current_password',
  'new_password',
  'token',
  'access_token',
  'refresh_token',
  'email_verification_token',
  'password_reset_token',
  'authorization',
  'secret',
];
const PERSONAL_KEYS = ['cpf', 'cnpj', 'email', 'phone', 'telephone'];
const MAX_STRING_LENGTH = 500;

/**
 * Remove recursivamente campos sensíveis de um payload antes de persistir em
 * AuditLog. Nunca deve deixar senha/token chegar ao banco (regra inegociável
 * de segurança do projeto).
 */
export function sanitizePayload(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED]`
      : value;
  }
  if (depth > 5 || value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (PERSONAL_KEYS.includes(key.toLowerCase())) {
      result[key] = maskPersonalValue(String(val ?? ''));
    } else {
      result[key] = sanitizePayload(val, depth + 1);
    }
  }
  return result;
}

function maskPersonalValue(value: string): string {
  if (!value) return value;
  if (value.includes('@')) {
    const [name, domain] = value.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  const digits = value.replace(/\D/g, '');
  return digits.length > 4 ? `***${digits.slice(-4)}` : '[MASKED]';
}
