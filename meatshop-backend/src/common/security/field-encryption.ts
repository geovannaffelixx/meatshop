import { createHash, createHmac } from 'crypto';
import type { ValueTransformer } from 'typeorm';
import { AesGcmCipher } from './aes-gcm-cipher';

type Environment = Record<string, string | undefined>;

export const DATA_ENCRYPTION_KEY = 'DATA_ENCRYPTION_KEY';
export const DATA_HASH_KEY = 'DATA_HASH_KEY';
export const DATA_KEY_BYTES = 32;
const CIPHERTEXT_PREFIX = 'enc:v1:';
const DEVELOPMENT_KEY_LABEL = 'meatshop-development-only';

export function parseDataKey(environment: Environment, name: string): Buffer | null {
  const value = environment[name]?.trim();
  if (!value) return null;
  const key = Buffer.from(value, 'base64');
  if (key.length !== DATA_KEY_BYTES || key.toString('base64') !== value) {
    throw new Error(`${name} must be the base64 encoding of ${DATA_KEY_BYTES} random bytes`);
  }
  return key;
}

function resolveKey(environment: Environment, name: string): Buffer {
  const key = parseDataKey(environment, name);
  if (key) return key;
  if (environment.NODE_ENV === 'production') throw new Error(`${name} is required in production`);
  return createHash('sha256').update(`${DEVELOPMENT_KEY_LABEL}:${name}`).digest();
}

export class FieldEncryption {
  constructor(
    private readonly cipher: AesGcmCipher,
    private readonly hashKey: Buffer,
  ) {}

  static fromEnvironment(environment: Environment): FieldEncryption {
    return new FieldEncryption(
      new AesGcmCipher(resolveKey(environment, DATA_ENCRYPTION_KEY)),
      resolveKey(environment, DATA_HASH_KEY),
    );
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(CIPHERTEXT_PREFIX);
  }

  encrypt(plaintext: string): string {
    return `${CIPHERTEXT_PREFIX}${this.cipher.encrypt(plaintext)}`;
  }

  decrypt(value: string): string {
    if (!this.isEncrypted(value)) return value;
    return this.cipher.decrypt(value.slice(CIPHERTEXT_PREFIX.length));
  }

  blindIndex(normalizedValue: string): string {
    return createHmac('sha256', this.hashKey).update(normalizedValue).digest('hex');
  }
}

let cached: { signature: string; instance: FieldEncryption } | null = null;

export function fieldEncryption(environment: Environment = process.env): FieldEncryption {
  const signature = [
    environment.NODE_ENV,
    environment[DATA_ENCRYPTION_KEY],
    environment[DATA_HASH_KEY],
  ].join('|');
  if (cached?.signature !== signature) {
    cached = { signature, instance: FieldEncryption.fromEnvironment(environment) };
  }
  return cached.instance;
}

export const encryptedColumnTransformer: ValueTransformer = {
  to: (value: unknown) => (typeof value === 'string' ? fieldEncryption().encrypt(value) : value),
  from: (value: unknown) => (typeof value === 'string' ? fieldEncryption().decrypt(value) : value),
};
