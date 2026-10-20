import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { AiRateLimitException } from './ai-rate-limit.exception';

@Catch(AiRateLimitException)
export class AiRateLimitFilter implements ExceptionFilter {
  catch(exception: AiRateLimitException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.setHeader('Retry-After', String(exception.retryAfterSeconds));
    response.status(exception.getStatus()).json(exception.getResponse());
  }
}
