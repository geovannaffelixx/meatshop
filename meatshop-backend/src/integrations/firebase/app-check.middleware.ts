import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { FirebaseService } from './firebase.service';

@Injectable()
export class AppCheckMiddleware implements NestMiddleware {
  constructor(
    private readonly config: ConfigService,
    private readonly firebase: FirebaseService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const enforce = this.config.get<string>('FIREBASE_APP_CHECK_ENFORCED') === 'true';
    if (!enforce || !this.isProtectedRoute(req)) {
      next();
      return;
    }
    const token = req.header('x-firebase-appcheck');
    if (!token) {
      throw new UnauthorizedException({
        code: 'APP_CHECK_REQUIRED',
        message: 'App attestation is required.',
      });
    }
    await this.firebase.verifyAppCheckToken(token);
    next();
  }

  private isProtectedRoute(request: Request): boolean {
    const configured =
      this.config.get<string>('FIREBASE_APP_CHECK_PROTECTED_PATHS') ?? '/auth/firebase-exchange';
    const requestPath = request.path || request.originalUrl.split('?')[0];
    return configured
      .split(',')
      .map((path) => path.trim())
      .filter(Boolean)
      .some((path) => requestPath === path || requestPath.startsWith(`${path}/`));
  }
}
