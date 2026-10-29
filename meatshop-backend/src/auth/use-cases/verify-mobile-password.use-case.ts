import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { CredentialAttemptsService } from '../services/credential-attempts.service';

@Injectable()
export class VerifyMobilePasswordUseCase {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}

  async execute(email: string, password: string): Promise<{ allowed: true }> {
    const key = this.config.get<string>('FIREBASE_WEB_API_KEY');
    if (!key) throw new ServiceUnavailableException('Authentication is unavailable');
    const emulator = this.config.get<string>('FIREBASE_AUTH_EMULATOR_HOST');
    const useEmulator =
      ['development', 'test'].includes(this.config.get<string>('NODE_ENV') ?? '') && emulator;
    const origin = useEmulator
      ? `http://${emulator}/identitytoolkit.googleapis.com`
      : 'https://identitytoolkit.googleapis.com';
    const result = await new CredentialAttemptsService(this.db).authenticate(email, async () => {
      let response: Response;
      try {
        response = await globalThis.fetch(
          `${origin}/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              password,
              returnSecureToken: true,
            }),
            signal: AbortSignal.timeout(10000),
          },
        );
      } catch {
        throw new ServiceUnavailableException('Authentication is unavailable');
      }
      if (response.ok) return true;
      const payload = (await response.json()) as { error?: { message?: string } };
      if (
        [
          'INVALID_LOGIN_CREDENTIALS',
          'INVALID_PASSWORD',
          'EMAIL_NOT_FOUND',
          'TOO_MANY_ATTEMPTS_TRY_LATER',
        ].includes(payload.error?.message ?? '')
      )
        return null;
      throw new ServiceUnavailableException('Authentication is unavailable');
    });
    if (!result) throw new UnauthorizedException('Invalid credentials');
    return { allowed: true };
  }
}
