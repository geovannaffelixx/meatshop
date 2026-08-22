import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

type ErrorDetails = { code?: string; message: string | string[]; error?: string };
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
  UQ_units_cnpj: {
    code: 'CNPJ_ALREADY_EXISTS',
    message: 'Já existe um açougue cadastrado com este CNPJ.',
  },
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const { status, details } = this.resolveError(exception);

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

  private resolveError(exception: unknown): { status: number; details: ErrorDetails } {
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
