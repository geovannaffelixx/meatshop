import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export class FcmTokenInvalidError extends Error {}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private app: App | null = null;

  constructor(private readonly config: ConfigService) {
    const rawServiceAccount = (this.config.get<string>('FIREBASE_SERVICE_ACCOUNT') || '').trim();

    if (!rawServiceAccount) {
      this.app = null;
      return;
    }

    try {
      const credentials = JSON.parse(rawServiceAccount);
      this.app = initializeApp({
        credential: cert(credentials),
      });
    } catch (error) {
      this.logger.error(
        'Failed to initialize Firebase Admin SDK from FIREBASE_SERVICE_ACCOUNT',
        error instanceof Error ? error.stack : undefined,
      );
      this.app = null;
    }
  }

  private ensureApp(): App {
    if (!this.app) {
      throw new ServiceUnavailableException(
        'Firebase não configurado: defina FIREBASE_SERVICE_ACCOUNT no ambiente.',
      );
    }
    return this.app;
  }

  async send(fcmToken: string, notification: { title: string; body: string }): Promise<void> {
    const app = this.ensureApp();

    try {
      await getMessaging(app).send({
        token: fcmToken,
        notification,
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        throw new FcmTokenInvalidError(code);
      }

      this.logger.error('FCM send error', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}
