import { PaymentWebhookQueueService } from '../payments/payment-webhook-queue.service';
import { MetricsModule } from '../metrics/metrics.module';
import { Module } from '@nestjs/common';
import { OrdersModule } from '@/orders/orders.module';
import { MercadoPagoController } from '@/mercadopago/mercadopago.controller';
import { MercadoPagoWebhookController } from '@/mercadopago/mercadopago.webhook.controller';

@Module({
  imports: [OrdersModule, MetricsModule],
  providers: [PaymentWebhookQueueService],
  controllers: [MercadoPagoController, MercadoPagoWebhookController],
  exports: [OrdersModule],
})
export class MercadoPagoModule {}
