import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { CSRF_COOKIE, CSRF_HEADER, requiresCsrf, validCsrfToken } from '../security/csrf';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    if (
      !requiresCsrf(request) ||
      validCsrfToken(request.cookies?.[CSRF_COOKIE], request.get(CSRF_HEADER))
    ) {
      next();
      return;
    }
    response.status(403).json({
      statusCode: 403,
      code: 'CSRF_TOKEN_INVALID',
      message: 'A valid CSRF token is required.',
    });
  }
}
