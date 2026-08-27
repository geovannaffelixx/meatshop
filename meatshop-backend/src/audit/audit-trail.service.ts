import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { AuditLog, AuditOutcome } from './entities/audit-log.entity';
import { sanitizePayload } from './utils/sanitize-payload';

export interface IAuditEvent {
  action: string;
  entity: string;
  entityId?: string | null;
  description?: string;
  outcome?: AuditOutcome;
  userId?: number | null;
  unitId?: number | null;
  actorType?: string;
  actorIdentifier?: string | null;
  oldData?: unknown;
  newData?: unknown;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  correlationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async record(event: IAuditEvent): Promise<void> {
    const log = this.repository.create({
      user_id: event.userId ?? null,
      unit_id: event.unitId ?? null,
      actor_type: event.actorType ?? (event.userId ? 'USER' : 'ANONYMOUS'),
      actor_identifier: this.hashIdentifier(event.actorIdentifier),
      action: event.action.slice(0, 50),
      entity: event.entity.slice(0, 100),
      entity_id: event.entityId?.slice(0, 50) ?? null,
      description: (event.description ?? `${event.action} em ${event.entity}`).slice(0, 255),
      outcome: event.outcome ?? AuditOutcome.SUCCESS,
      method: event.method?.slice(0, 10) ?? null,
      path: event.path?.slice(0, 255) ?? null,
      status_code: event.statusCode ?? null,
      correlation_id: event.correlationId?.slice(0, 64) ?? null,
      ip_address: event.ipAddress?.slice(0, 64) ?? null,
      user_agent: event.userAgent?.slice(0, 255) ?? null,
      old_data: this.serialize(event.oldData),
      new_data: this.serialize(event.newData),
    });
    await this.repository.save(log);
  }

  contextFromRequest(request: Request): Partial<IAuditEvent> {
    const user = request.user as { id?: number; unit_id?: number } | undefined;
    return {
      userId: user?.id ?? null,
      unitId: user?.unit_id ?? this.numberParam(request.params?.unitId),
      actorIdentifier: this.findIdentifier(request.body),
      method: request.method,
      path: request.path,
      correlationId: String((request as Request & { correlationId?: string }).correlationId ?? ''),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
    };
  }

  async safeRecord(event: IAuditEvent): Promise<void> {
    try {
      await this.record(event);
    } catch (error) {
      this.logger.error(
        'Falha ao persistir evento de auditoria',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private serialize(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    return JSON.stringify(sanitizePayload(value));
  }

  private hashIdentifier(value?: string | null): string | null {
    return value ? createHash('sha256').update(value.toLowerCase()).digest('hex') : null;
  }

  private findIdentifier(body: unknown): string | null {
    if (!body || typeof body !== 'object') return null;
    const data = body as Record<string, unknown>;
    return String(data.email ?? data.cpf ?? data.cnpj ?? '') || null;
  }

  private numberParam(value?: string): number | null {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
}
