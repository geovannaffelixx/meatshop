import { Controller, Get, Param, ParseIntPipe, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { GlobalRole } from '../common/enums/global-role.enum';
import { FilterAuditLogDto } from './dtos/filter-audit-log.dto';
import { ExportAuditLogDto } from './dtos/export-audit-log.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ExportAuditLogsUseCase } from './use-cases/export-audit-logs.use-case';
import { GetAuditLogUseCase } from './use-cases/get-audit-log.use-case';
import { GetAuditSummaryUseCase } from './use-cases/get-audit-summary.use-case';
import { ListAuditLogsUseCase } from './use-cases/list-audit-logs.use-case';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@Roles(GlobalRole.SUPER_ADMIN)
@Controller('audit-logs')
export class AuditController {
  constructor(
    private readonly listLogs: ListAuditLogsUseCase,
    private readonly getLog: GetAuditLogUseCase,
    private readonly getSummary: GetAuditSummaryUseCase,
    private readonly exportLogs: ExportAuditLogsUseCase,
  ) {}

  @ApiOperation({ summary: 'Global audit summary' })
  @Get('summary')
  summary() {
    return this.getSummary.execute();
  }

  @ApiOperation({ summary: 'Exports filtered unit events as Excel, PDF or JSON for SUPER_ADMIN' })
  @Get('export')
  async export(
    @Query() filters: ExportAuditLogDto,
    @CurrentUser() user: User,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.exportLogs.execute(filters, user);
    response.setHeader('Content-Type', file.mime);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.buffer);
  }

  @ApiOperation({ summary: 'Lists audit events with filters' })
  @Get()
  list(@Query() filters: FilterAuditLogDto) {
    return this.listLogs.execute(filters);
  }

  @ApiOperation({ summary: 'Detalha um evento de auditoria' })
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.getLog.execute(id);
  }
}
