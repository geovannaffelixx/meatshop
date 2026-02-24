import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '@/entities/order.entity';
import { MercadoPagoService } from '@/mercadopago/mercadopago.service';
import { MercadoPagoController } from '@/mercadopago/mercadopago.controller';
import { MercadoPagoWebhookController } from '@/mercadopago/mercadopago.webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [MercadoPagoController, MercadoPagoWebhookController],
  providers: [MercadoPagoService],
})
export class MercadoPagoModule {}
