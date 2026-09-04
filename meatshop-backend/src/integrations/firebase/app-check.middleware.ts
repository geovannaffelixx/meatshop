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
    if (!enforce || req.header('x-meatshop-client') !== 'mobile') {
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
}
