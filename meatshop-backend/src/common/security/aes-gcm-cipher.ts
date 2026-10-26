import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const SEPARATOR = '.';
const ENCODING = 'base64url';

export class AesGcmCipher {
  constructor(private readonly key: Buffer) {
    if (key.length !== KEY_BYTES) throw new Error(`AES-256-GCM requires a ${KEY_BYTES}-byte key`);
  }

  static fromSecret(secret: string): AesGcmCipher {
    return new AesGcmCipher(createHash('sha256').update(secret).digest());
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted]
      .map((part) => part.toString(ENCODING))
      .join(SEPARATOR);
  }

  decrypt(payload: string): string {
    const parts = payload.split(SEPARATOR);
    const [iv, tag, encrypted] = parts;
    if (parts.length !== 3 || !iv || !tag) throw new Error('Invalid ciphertext');
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(iv, ENCODING));
    decipher.setAuthTag(Buffer.from(tag, ENCODING));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, ENCODING)),
      decipher.final(),
    ]).toString('utf8');
  }
}
