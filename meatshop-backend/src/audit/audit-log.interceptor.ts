import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { from, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { DataSource, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import {
  isExcludedPath,
  isMutatingMethod,
  resolveRouteAuditInfo,
  RouteAuditInfo,
  tableNameFor,
} from './utils/route-audit-info';
import { sanitizePayload } from './utils/sanitize-payload';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id ?? null;

    if (!userId || !isMutatingMethod(request.method) || isExcludedPath(request.path)) {
      return next.handle();
    }

    const routePath = request.route?.path ?? request.path;
    const info = resolveRouteAuditInfo(request.method, routePath, request.params ?? {});

    return from(this.fetchOldData(request.method, info)).pipe(
      switchMap((oldData) =>
        next.handle().pipe(
          tap((response) => {
            this.recordLog(userId, info, oldData, response, request.method);
          }),
        ),
      ),
    );
  }

  private async fetchOldData(method: string, info: RouteAuditInfo): Promise<string | null> {
    if (method.toUpperCase() === 'POST' || !info.entityId) {
      return null;
    }

    const table = tableNameFor(info.entity);
    if (!table) return null;

    try {
      const rows = await this.dataSource.query(
        `SELECT * FROM "${table}" WHERE id = $1`,
        [info.entityId],
      );
      return rows?.[0] ? JSON.stringify(sanitizePayload(rows[0])) : null;
    } catch {
      return null;
    }
  }

  private recordLog(
    userId: number,
    info: RouteAuditInfo,
    oldData: string | null,
    response: unknown,
    method: string,
  ): void {
    const entityId = info.entityId ?? this.extractIdFromResponse(response);
    const newData =
      method.toUpperCase() === 'DELETE' ? null : JSON.stringify(sanitizePayload(response));

    const log = this.auditLogRepository.create({
      user_id: userId,
      action: info.action,
      entity: info.entity,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
    });

    this.auditLogRepository.save(log).catch((error) => {
      this.logger.error(
        'Failed to persist audit log',
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  private extractIdFromResponse(response: unknown): string | null {
    if (response && typeof response === 'object' && 'id' in response) {
      return String((response as { id: unknown }).id);
    }
    return null;
  }
}
