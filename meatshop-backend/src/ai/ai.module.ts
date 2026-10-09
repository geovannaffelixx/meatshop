import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsModule } from '../metrics/metrics.module';
import { Product } from '../products/entities/product.entity';
import { UnitsModule } from '../units/units.module';
import { AiChatbotClient } from './ai-chatbot.client';
import { AiConversationService } from './ai-conversation.service';
import { AiController } from './ai.controller';
import { AiRateLimitService } from './ai-rate-limit.service';
import { AiRateLimitFilter } from './ai-rate-limit.filter';
import { AiRetentionService } from './ai-retention.service';
import { AiService } from './ai.service';
import { AiConversation } from './entities/ai-conversation.entity';
import { AiMessage } from './entities/ai-message.entity';
import { AiRateLimit } from './entities/ai-rate-limit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, AiConversation, AiMessage, AiRateLimit]),
    UnitsModule,
    MetricsModule,
  ],
  controllers: [AiController],
  providers: [
    AiChatbotClient,
    AiConversationService,
    AiRateLimitService,
    AiRateLimitFilter,
    AiRetentionService,
    AiService,
  ],
})
export class AiModule {}
