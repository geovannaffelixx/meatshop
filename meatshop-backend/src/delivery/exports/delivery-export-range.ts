import { BadRequestException } from '@nestjs/common';
import { businessMidnight } from '../../finance/utils/month-range.util';
import type { DeliveryExportDto } from './dtos/delivery-export.dto';

export function deliveryExportRange(filters: DeliveryExportDto): [Date, Date] {
  if (!filters.from || !filters.to || filters.from > filters.to)
    throw new BadRequestException({
      code: 'EXPORT_INVALID_PERIOD',
      message: 'Informe uma data inicial e final válidas para o relatório.',
    });
  const start = new Date(`${filters.from}T00:00:00Z`);
  const end = new Date(`${filters.to}T00:00:00Z`);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start.toISOString().slice(0, 10) !== filters.from ||
    end.toISOString().slice(0, 10) !== filters.to
  )
    throw new BadRequestException({
      code: 'EXPORT_INVALID_PERIOD',
      message: 'Informe datas válidas para o relatório.',
    });
  end.setUTCDate(end.getUTCDate() + 1);
  return [businessMidnight(start), businessMidnight(end)];
}
