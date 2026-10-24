import { sanitizePayload } from '../../audit/utils/sanitize-payload';
import { Injectable } from '@nestjs/common';
import { Logger } from 'winston';

type Meta = Record<string, any>;

function sanitizeMeta(meta?: Meta): Meta | undefined {
  return meta ? (sanitizePayload(meta) as Meta) : undefined;
}

@Injectable()
export class AppLogger {
  constructor(private readonly logger: Logger) {}

  child(meta: Meta) {
    return new AppLogger(this.logger.child(sanitizeMeta(meta) || {}));
  }

  info(msg: string, meta?: Meta) {
    this.logger.info(msg, sanitizeMeta(meta));
  }

  warn(msg: string, meta?: Meta) {
    this.logger.warn(msg, sanitizeMeta(meta));
  }

  error(msg: string, meta?: Meta) {
    this.logger.error(msg, sanitizeMeta(meta));
  }

  debug(msg: string, meta?: Meta) {
    this.logger.debug(msg, sanitizeMeta(meta));
  }
}
