import { redactSensitiveText } from '../../ai/ai-sensitive-data';
const SENSITIVE_KEYS = [
  'code',
  'cpf_hash',
  'phone_hash',
  'pickup_code_hash',
  'delivery_code_hash',
  'delivery_code_ciphertext',
  'contact',
  'password',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'id_token',
  'firebase_id_token',
  'x-firebase-reauth-token',
  'apikey',
  'api_key',
  'jwt',
  'cookie',
  'set-cookie',
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
  'session_id',
  'tracking_session_id',
  'latitude',
  'longitude',
  'lat',
  'lng',
  'dest_lat',
  'dest_lng',
  'unit_lat',
  'unit_lng',
  'street',
  'number',
  'complement',
  'zip_code',
];
const PERSONAL_KEYS = [
  'cpf',
  'cpfcnpj',
  'cnpj',
  'email',
  'phone',
  'telephone',
  'latitude',
  'longitude',
  'lat',
  'lng',
  'dest_lat',
  'dest_lng',
  'unit_lat',
  'unit_lng',
  'street',
  'number',
  'complement',
  'zip_code',
];
const MAX_STRING_LENGTH = 500;

export function sanitizePayload(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') {
    const sanitized = redactSensitiveText(value);
    return sanitized.length > MAX_STRING_LENGTH
      ? `${sanitized.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED]`
      : sanitized;
  }
  if (depth > 5) return '[TRUNCATED]';
  if (value === null || typeof value !== 'object') {
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
