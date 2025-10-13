import * as winston from 'winston';
import * as path from 'path';
import 'winston-daily-rotate-file';

export function createAppLogger() {
  const logDir = path.resolve(process.cwd(), 'logs');

  // Cores personalizadas por nível
  winston.addColors({
    info: 'bold blue',
    warn: 'yellow',
    error: 'bold red',
    debug: 'cyan',
  });

  const colorizer = winston.format.colorize();

  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return colorizer.colorize(level, `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaStr}`);
    })
  );

  const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
      new winston.transports.Console({ format: consoleFormat }),

      // Arquivo rotativo diário (JSON)
      new (winston.transports as any).DailyRotateFile({
        dirname: logDir,
        filename: 'app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxFiles: '14d',
        format: fileFormat,
      }),
    ],
  });
}