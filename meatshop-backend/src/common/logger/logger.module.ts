import { Global, Module } from '@nestjs/common';
import * as winston from 'winston';
import { AppLogger } from './app.logger';
import { createAppLogger } from './logger.config';

@Global()
@Module({
  providers: [
    {
      provide: 'Logger',
      useFactory: () => createAppLogger(),
    },
    {
      provide: AppLogger,
      useFactory: (logger: winston.Logger) => new AppLogger(logger), // 👈 injeta a instância
      inject: ['Logger'],
    },
  ],
  exports: [AppLogger],
})
export class LoggerModule {}