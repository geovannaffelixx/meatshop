import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import type { Auth, DecodedIdToken, UserRecord } from 'firebase-admin/auth';
import type { AppCheckToken } from 'firebase-admin/app-check';

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
      if (config.get<string>('NODE_ENV') === 'production') {
        throw new Error('Firebase Admin initialization failed', { cause: error });
      }
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

  async verifyAppCheckToken(token: string): Promise<AppCheckToken> {
    const app = this.getApp();
    try {
      const { getAppCheck } = (await Function('return import("firebase-admin/app-check")')()) as {
        getAppCheck(app: App): {
          verifyToken(value: string): Promise<AppCheckToken>;
        };
      };
      return await getAppCheck(app).verifyToken(token);
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_APP_CHECK_TOKEN',
        message: 'App attestation is invalid or expired.',
      });
    }
  }

  async createPasswordUser(input: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<UserRecord> {
    const auth = await this.auth();
    return auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      emailVerified: true,
      disabled: false,
    });
  }

  async deleteUser(uid: string): Promise<void> {
    try {
      await (await this.auth()).deleteUser(uid);
    } catch (error: unknown) {
      if (this.firebaseErrorCode(error) !== 'auth/user-not-found') throw error;
    }
  }

  private async auth(): Promise<Auth> {
    const app = this.getApp();
    const { getAuth } = (await Function('return import("firebase-admin/auth")')()) as {
      getAuth(app: App): Auth;
    };
    return getAuth(app);
  }

  private firebaseErrorCode(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
    return typeof error.code === 'string' ? error.code : undefined;
  }
}
