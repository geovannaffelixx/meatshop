import { Controller, Get, Param, ParseIntPipe, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { GlobalRole } from '../common/enums/global-role.enum';
import { FilterAuditLogDto } from './dtos/filter-audit-log.dto';
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

  @ApiOperation({ summary: 'Resumo global da auditoria' })
  @Get('summary')
  summary() {
    return this.getSummary.execute();
  }

  @ApiOperation({ summary: 'Exporta até 10.000 eventos filtrados em CSV' })
  @Get('export')
  async export(@Query() filters: FilterAuditLogDto, @Res() response: Response): Promise<void> {
    const csv = await this.exportLogs.execute(filters);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="auditoria-${Date.now()}.csv"`);
    response.send(`\uFEFF${csv}`);
  }

  @ApiOperation({ summary: 'Lista eventos de auditoria com filtros' })
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
