import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter
  implements ExceptionFilter
{
  catch(
    exception: unknown,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse();

    const request = ctx.getRequest();

    console.error(exception);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : String(exception);

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}