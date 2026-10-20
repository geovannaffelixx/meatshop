import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { MetricsService } from '../metrics/metrics.service';
import { AiConversation } from './entities/ai-conversation.entity';
import { AiRateLimit } from './entities/ai-rate-limit.entity';

@Injectable()
export class AiRetentionService {
  private readonly logger = new Logger(AiRetentionService.name);

  constructor(
    @InjectRepository(AiConversation)
    private readonly conversations: Repository<AiConversation>,
    @InjectRepository(AiRateLimit)
    private readonly rateLimits: Repository<AiRateLimit>,
    private readonly metrics: MetricsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpired(): Promise<void> {
    const now = new Date();
    const conversations = await this.conversations.delete({
      expires_at: LessThanOrEqual(now),
    });
    await this.rateLimits.delete({
      updated_at: LessThan(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
    });
    const purged = conversations.affected ?? 0;
    this.metrics.observeAiConversationPurge(purged);
    if (purged > 0) this.logger.log(`${purged} conversa(s) de IA expirada(s) removida(s)`);
  }
}
