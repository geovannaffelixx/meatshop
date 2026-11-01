import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ExportReportDto } from './dtos/export-report.dto';
import { ExportReportUseCase } from './export-report.use-case';
import { ReportAccessService } from './report-access.service';

@ApiTags('Exports')
@ApiBearerAuth('access-token')
@Controller('exports')
export class ExportsController {
  constructor(
    private readonly exportReport: ExportReportUseCase,
    private readonly access: ReportAccessService,
  ) {}

  @Get('units')
  @ApiOperation({ summary: 'Lists report unit options for SUPER_ADMIN' })
  units(@CurrentUser() user: User) {
    return this.access.units(user);
  }

  @Get('reports')
  @ApiOperation({
    summary:
      'Exports filtered unit reports as Excel/PDF for OWNER/MANAGER, plus JSON for SUPER_ADMIN',
  })
  @ApiResponse({ status: 403, description: 'Role, unit membership or format not permitted' })
  @ApiResponse({ status: 413, description: 'More than 10,000 rows; refine filters' })
  async report(
    @Query() filters: ExportReportDto,
    @CurrentUser() user: User,
    @Res() response: Response,
  ) {
    const file = await this.exportReport.execute(filters, user);
    response.setHeader('Content-Type', file.mime);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.buffer);
  }
}
