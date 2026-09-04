import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, Repository } from 'typeorm';
import { readPositiveInteger } from '../../config/runtime-config';
import { DeliveryTracking } from '../entities/delivery-tracking.entity';

@Injectable()
export class DeliveryTrackingRetentionService {
  private readonly logger = new Logger(DeliveryTrackingRetentionService.name);
  private readonly retentionDays: number;

  constructor(
    @InjectRepository(DeliveryTracking)
    private readonly trackingRepository: Repository<DeliveryTracking>,
    config: ConfigService,
  ) {
    this.retentionDays = readPositiveInteger(
      { DELIVERY_TRACKING_RETENTION_DAYS: config.get<string>('DELIVERY_TRACKING_RETENTION_DAYS') },
      'DELIVERY_TRACKING_RETENTION_DAYS',
      30,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'America/Sao_Paulo' })
  async purgeExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const result = await this.trackingRepository.delete({ created_at: LessThan(cutoff) });
    const removed = result.affected ?? 0;
    if (removed > 0) this.logger.log(`Purged ${removed} expired delivery tracking records`);
    return removed;
  }
}
