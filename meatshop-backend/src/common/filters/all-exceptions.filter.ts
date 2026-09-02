import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { AuditTrailService } from '../../audit/audit-trail.service';
import { AuditOutcome } from '../../audit/entities/audit-log.entity';
import {
  isExcludedPath,
  isMutatingMethod,
  resolveRouteAuditInfo,
} from '../../audit/utils/route-audit-info';

type ErrorDetails = {
  code?: string;
  message: string | string[];
  error?: string;
};
type PostgresDriverError = { code?: string; constraint?: string };

const UNIQUE_CONSTRAINT_ERRORS: Record<string, ErrorDetails> = {
  UQ_users_email: {
    code: 'EMAIL_ALREADY_EXISTS',
    message: 'Já existe uma conta cadastrada com este e-mail.',
  },
  UQ_users_cpf: {
    code: 'CPF_ALREADY_EXISTS',
    message: 'Já existe uma conta cadastrada com este CPF.',
  },
  UQ_users_firebase_uid: {
    code: 'FIREBASE_IDENTITY_ALREADY_LINKED',
    message: 'Esta identidade Firebase já está vinculada a outra conta.',
  },
  UQ_users_phone: {
    code: 'PHONE_ALREADY_EXISTS',
    message: 'Já existe uma conta cadastrada com este telefone.',
  },
  UQ_units_cnpj: {
    code: 'CNPJ_ALREADY_EXISTS',
    message: 'Já existe um açougue cadastrado com este CNPJ.',
  },
};

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly auditTrail: AuditTrailService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const { status, details } = this.resolveError(exception);
    this.recordFailure(request, status, details);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      ...details,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private recordFailure(request: Request, status: number, details: ErrorDetails): void {
    if (!isMutatingMethod(request.method) || isExcludedPath(request.path)) return;
    const info = resolveRouteAuditInfo(
      request.method,
      request.route?.path ?? request.path,
      request.params ?? {},
    );
    void this.auditTrail.safeRecord({
      ...this.auditTrail.contextFromRequest(request),
      action: info.action,
      entity: info.entity,
      entityId: info.entityId,
      description: `${info.description} falhou: ${details.code ?? status}`,
      outcome: AuditOutcome.FAILURE,
      statusCode: status,
      newData: { error_code: details.code, validation: details.message },
    });
  }

  private resolveError(exception: unknown): {
    status: number;
    details: ErrorDetails;
  } {
    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as PostgresDriverError;
      if (driverError.code === '23505') {
        return {
          status: HttpStatus.CONFLICT,
          details: UNIQUE_CONSTRAINT_ERRORS[driverError.constraint ?? ''] ?? {
            code: 'RESOURCE_ALREADY_EXISTS',
            message: 'Já existe um cadastro com estas informações.',
          },
        };
      }
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        return { status: exception.getStatus(), details: { message: body } };
      }

      const payload = body as Partial<ErrorDetails>;
      return {
        status: exception.getStatus(),
        details: {
          ...(payload.code ? { code: payload.code } : {}),
          message: payload.message ?? exception.message,
          ...(payload.error ? { error: payload.error } : {}),
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      details: {
        code: 'INTERNAL_ERROR',
        message: 'Não foi possível concluir a operação. Tente novamente em instantes.',
      },
    };
  }
}
