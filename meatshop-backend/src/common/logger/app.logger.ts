import { Injectable } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class AppLogger {
  constructor(private readonly logger: winston.Logger) {}

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }
}