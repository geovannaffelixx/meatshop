import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { DeliveryExportDto } from './dtos/delivery-export.dto';
import { ExportDeliveryReportUseCase } from './export-delivery-report.use-case';

@ApiTags('Delivery exports')
@ApiBearerAuth('access-token')
@Controller('delivery/me/exports')
export class DeliveryExportsController {
  constructor(private readonly exportReport: ExportDeliveryReportUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Exports own delivery data as Excel/PDF; no unit, user or driver id accepted',
  })
  @ApiResponse({ status: 403, description: 'Only delivery profiles can export their own data' })
  @ApiResponse({ status: 413, description: 'Refine the period; more than 10,000 rows' })
  async export(
    @Query() filters: DeliveryExportDto,
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
