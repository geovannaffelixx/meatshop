import { Module } from '@nestjs/common';
import { OrdersModule } from '@/orders/orders.module';
import { MercadoPagoService } from '@/payments/providers/mercadopago.service';
import { MercadoPagoController } from '@/mercadopago/mercadopago.controller';
import { MercadoPagoWebhookController } from '@/mercadopago/mercadopago.webhook.controller';

@Module({
  imports: [OrdersModule],
  controllers: [MercadoPagoController, MercadoPagoWebhookController],
  providers: [MercadoPagoService],
})
export class MercadoPagoModule {}
