import { Module } from '@nestjs/common';
import { OrdersModule } from '@/orders/orders.module';
import { MercadoPagoController } from '@/mercadopago/mercadopago.controller';
import { MercadoPagoWebhookController } from '@/mercadopago/mercadopago.webhook.controller';

@Module({
  imports: [OrdersModule],
  controllers: [MercadoPagoController, MercadoPagoWebhookController],
  exports: [OrdersModule],
})
export class MercadoPagoModule {}
