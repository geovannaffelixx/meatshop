import { HttpException, HttpStatus } from '@nestjs/common';

export class AiRateLimitException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super(
      {
        code: 'AI_RATE_LIMITED',
        message: 'Muitas perguntas em sequência. Aguarde e tente novamente.',
        retry_after_seconds: retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
