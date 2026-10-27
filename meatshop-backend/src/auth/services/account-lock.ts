import { HttpException } from '@nestjs/common';

export const LOGIN_ATTEMPT_LIMIT = 5;
export const LOGIN_LOCK_MINUTES = 15;

export function accountLocked(until: Date): HttpException {
  return new HttpException(
    {
      code: 'ACCOUNT_LOCKED',
      message: 'Muitas tentativas. Aguarde para entrar novamente.',
      locked_until: until.toISOString(),
      retry_after_seconds: Math.max(1, Math.ceil((until.getTime() - Date.now()) / 1000)),
    },
    429,
  );
}
