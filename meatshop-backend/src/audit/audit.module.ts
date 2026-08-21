import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLog } from './entities/audit-log.entity';
import { ListAuditLogsUseCase } from './use-cases/list-audit-logs.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [
    ListAuditLogsUseCase,
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AuditModule {}
