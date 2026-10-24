import { Injectable, NestMiddleware } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

type AuditRequest = Request & { correlationId?: string; user?: { id?: number } };
export const auditRequestContext = new AsyncLocalStorage<AuditRequest>();

@Injectable()
export class AuditRequestContextMiddleware implements NestMiddleware {
  use(request: AuditRequest, _response: Response, next: NextFunction): void {
    if (!request.correlationId || !/^[a-zA-Z0-9._:-]{1,64}$/.test(request.correlationId))
      request.correlationId = randomUUID();
    auditRequestContext.run(request, next);
  }
}
