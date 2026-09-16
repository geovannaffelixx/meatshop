import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { DeliveryTracking } from '../entities/delivery-tracking.entity';
import { DeliveryTrackingRetentionService } from './delivery-tracking-retention.service';

describe('DeliveryTrackingRetentionService', () => {
  it('removes expired tracking records through the scheduled operation', async () => {
    const repository = {
      delete: jest.fn(async () => ({ affected: 3, raw: [] })),
    } as unknown as Repository<DeliveryTracking>;
    const service = new DeliveryTrackingRetentionService(
      repository,
      new ConfigService({ DELIVERY_TRACKING_RETENTION_DAYS: '30' }),
    );

    await expect(service.purgeExpired()).resolves.toBe(3);
    expect(repository.delete).toHaveBeenCalledTimes(1);
  });
});
