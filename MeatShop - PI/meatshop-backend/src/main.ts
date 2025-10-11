import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),
        new winston.transports.File({
          filename: 'logs/app.log',
          maxsize: 5_000_000, // 5MB
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),
      ],
    }),
  });

  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // remove campos desconhecidos do payload
      forbidNonWhitelisted: false, // (true: retorna 400 ao invés de só remover)
      transform: true,             // habilita transformação (e.g., ParseIntPipe implícito)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  const logger = winston.createLogger({
    transports: [new winston.transports.Console()],
  });
  logger.info(`Backend rodando em http://localhost:${port}`);
}
bootstrap();