import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLog } from './entities/audit-log.entity';
import { ListAuditLogsUseCase } from './use-cases/list-audit-logs.use-case';
import { AuditTrailService } from './audit-trail.service';
import { GetAuditLogUseCase } from './use-cases/get-audit-log.use-case';
import { GetAuditSummaryUseCase } from './use-cases/get-audit-summary.use-case';
import { ExportAuditLogsUseCase } from './use-cases/export-audit-logs.use-case';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [
    ListAuditLogsUseCase,
    AuditTrailService,
    GetAuditLogUseCase,
    GetAuditSummaryUseCase,
    ExportAuditLogsUseCase,
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
  exports: [AuditTrailService],
})
export class AuditModule {}
