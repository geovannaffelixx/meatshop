import { beforeEach, jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import { AppProfile } from '../../common/enums/app-profile.enum';
import type { AuditTrailService } from '../../audit/audit-trail.service';
import type { ReportFileService } from '../../exports/report-file.service';
import type { User } from '../../users/entities/user.entity';
import type { DeliveryPerson } from '../entities/delivery-person.entity';
import type { BuildDeliveryReportService } from './build-delivery-report.service';
import { ExportDeliveryReportUseCase } from './export-delivery-report.use-case';
import type { DeliveryExportDto } from './dtos/delivery-export.dto';

describe('Delivery export authorization', () => {
  const people = { findOneBy: jest.fn<() => Promise<unknown>>() };
  const builder = {
    build: jest.fn<() => Promise<unknown>>().mockResolvedValue({ title: 'Ganhos' }),
  };
  const files = {
    create: jest.fn<() => Promise<unknown>>().mockResolvedValue({ buffer: Buffer.from('report') }),
  };
  const audit = { safeRecord: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) };
  const service = new ExportDeliveryReportUseCase(
    people as unknown as Repository<DeliveryPerson>,
    builder as unknown as BuildDeliveryReportService,
    files as unknown as ReportFileService,
    audit as unknown as AuditTrailService,
  );
  const filters: DeliveryExportDto = { report: 'personal', format: 'pdf' };
  beforeEach(() => {
    jest.clearAllMocks();
    people.findOneBy.mockResolvedValue({ id: 91, user_id: 7 });
  });

  it.each([AppProfile.DELIVERY, AppProfile.BOTH])(
    'allows own %s data without membership or unit',
    async (profile) => {
      const user = { id: 7, app_profile: profile, is_active: true } as User;
      await service.execute(filters, user);
      expect(people.findOneBy).toHaveBeenCalledWith({ user_id: 7 });
      expect(builder.build).toHaveBeenCalledWith(filters, user, 91);
      expect(audit.safeRecord).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7, action: 'EXPORT_DELIVERY_REPORT' }),
      );
    },
  );
  it('rejects clients even if there is a stale delivery profile', async () => {
    await expect(
      service.execute(filters, { id: 7, is_active: true, app_profile: AppProfile.CLIENT } as User),
    ).rejects.toMatchObject({ response: { code: 'DELIVERY_EXPORT_FORBIDDEN' } });
    expect(people.findOneBy).not.toHaveBeenCalled();
    expect(builder.build).not.toHaveBeenCalled();
  });
  it('rejects a missing driver profile and inactive accounts', async () => {
    people.findOneBy.mockResolvedValue(null);
    await expect(
      service.execute(filters, {
        id: 7,
        is_active: true,
        app_profile: AppProfile.DELIVERY,
      } as User),
    ).rejects.toThrow();
    await expect(
      service.execute(filters, {
        id: 7,
        is_active: false,
        app_profile: AppProfile.DELIVERY,
      } as User),
    ).rejects.toThrow();
    expect(files.create).not.toHaveBeenCalled();
  });
});
