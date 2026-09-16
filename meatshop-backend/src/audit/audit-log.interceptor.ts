import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Request } from 'express';
import { from, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { DataSource } from 'typeorm';
import { AuditTrailService } from './audit-trail.service';
import {
  isExcludedPath,
  isMutatingMethod,
  resolveRouteAuditInfo,
  IRouteAuditInfo,
  tableNameFor,
} from './utils/route-audit-info';
import { sanitizePayload } from './utils/sanitize-payload';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditTrail: AuditTrailService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    if (!isMutatingMethod(request.method) || isExcludedPath(request.path)) return next.handle();
    const info = resolveRouteAuditInfo(
      request.method,
      request.route?.path ?? request.path,
      request.params ?? {},
    );
    return from(this.fetchOldData(request.method, info)).pipe(
      mergeMap((oldData) =>
        next.handle().pipe(
          mergeMap(async (response) => {
            await this.auditTrail.safeRecord({
              ...this.auditTrail.contextFromRequest(request),
              action: info.action,
              entity: info.entity,
              entityId: info.entityId ?? this.extractId(response),
              description: info.description,
              statusCode: context.switchToHttp().getResponse().statusCode,
              oldData,
              newData: request.method === 'DELETE' ? null : response,
            });
            return response;
          }),
        ),
      ),
    );
  }

  private async fetchOldData(method: string, info: IRouteAuditInfo): Promise<unknown> {
    if (method === 'POST' || !info.entityId) return null;
    const table = tableNameFor(info.entity);
    if (!table) return null;
    try {
      const rows = await this.dataSource.query(`SELECT * FROM "${table}" WHERE id = $1`, [
        info.entityId,
      ]);
      return rows?.[0] ? sanitizePayload(rows[0]) : null;
    } catch {
      return null;
    }
  }

  private extractId(response: unknown): string | null {
    if (!response || typeof response !== 'object') return null;
    const data = response as Record<string, unknown>;
    if (data.id !== undefined) return String(data.id);
    const nested = data.data as Record<string, unknown> | undefined;
    return nested?.id !== undefined ? String(nested.id) : null;
  }
}
