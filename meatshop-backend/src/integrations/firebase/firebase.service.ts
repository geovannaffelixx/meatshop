import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import type { Auth, DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private readonly app: App | null;

  constructor(config: ConfigService) {
    const rawServiceAccount = (config.get<string>('FIREBASE_SERVICE_ACCOUNT') || '').trim();
    if (!rawServiceAccount) {
      this.app = null;
      return;
    }

    try {
      this.app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(rawServiceAccount)) });
    } catch (error) {
      this.logger.error(
        'Failed to initialize Firebase Admin SDK',
        error instanceof Error ? error.stack : undefined,
      );
      this.app = null;
    }
  }

  getApp(): App {
    if (!this.app) {
      throw new ServiceUnavailableException('Firebase Admin is not configured.');
    }
    return this.app;
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    const app = this.getApp();
    try {
      // Firebase Admin v14 pulls an ESM-only JOSE dependency. Loading Auth
      // lazily keeps CommonJS/Jest startup compatible while preserving the
      // native ESM loader in production.
      const { getAuth } = (await Function('return import("firebase-admin/auth")')()) as {
        getAuth(app: App): Auth;
      };
      return await getAuth(app).verifyIdToken(idToken, true);
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_FIREBASE_TOKEN',
        message: 'Firebase ID token is invalid, expired, or revoked.',
      });
    }
  }
}
