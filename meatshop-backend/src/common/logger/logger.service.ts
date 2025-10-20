import { Injectable } from '@nestjs/common';
import { Logger } from 'winston';

type Meta = Record<string, any>;

function maskCpf(value: string): string {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length === 11) return '[REDACTED-CPF]';
  return value;
}

function sanitizeMeta(meta?: Meta): Meta | undefined {
  if (!meta) return meta;
  const clone: Meta = JSON.parse(JSON.stringify(meta));

  const SENSITIVE_KEYS = [
    'password',
    'senha',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'jwt',
    'cpf',
    'cpfCnpj',
  ];
  for (const key of Object.keys(clone)) {
    const lower = key.toLowerCase();

    if (SENSITIVE_KEYS.includes(lower)) {
      if (lower === 'cpf' || lower === 'cpfcnpj') {
        clone[key] = maskCpf(String(clone[key]));
      } else {
        clone[key] = '[REDACTED]';
      }
    }

    if (clone[key] && typeof clone[key] === 'object') {
      clone[key] = sanitizeMeta(clone[key]);
    }
  }

  return clone;
}

@Injectable()
export class AppLogger {
  constructor(private readonly logger: Logger) {}

  child(meta: Meta) {
    return new AppLogger(this.logger.child(sanitizeMeta(meta) || {}));
  }

  info(msg: string, meta?: Meta) {
    this.logger.info(msg, sanitizeMeta(meta));
  }

  warn(msg: string, meta?: Meta) {
    this.logger.warn(msg, sanitizeMeta(meta));
  }

  error(msg: string, meta?: Meta) {
    this.logger.error(msg, sanitizeMeta(meta));
  }

  debug(msg: string, meta?: Meta) {
    this.logger.debug(msg, sanitizeMeta(meta));
  }
}
