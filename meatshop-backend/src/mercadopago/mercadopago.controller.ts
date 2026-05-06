import { Controller, Post, Param, ParseIntPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { MercadoPagoService } from '@/payments/providers/mercadopago.service';

@Controller('mercadopago')
export class MercadoPagoController {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    private readonly mp: MercadoPagoService,
  ) {}

  @Post('orders/:id/checkout')
  async createCheckout(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersRepo.findOne({ where: { id } });
    if (!order) return { ok: false, message: 'Pedido não encontrado' };

    const total = Math.max(0, Number(order.valor) - Number(order.desconto ?? 0));

    const pref = await this.mp.createPreference({
      orderId: order.id,
      amount: total,
      description: `Pedido #${order.id} - MeatShop`,
    });

    order.mpPreferenceId = pref.preferenceId;
    order.mpStatus = 'created';
    order.mpLastEventAt = new Date();
    await this.ordersRepo.save(order);

    return { ok: true, checkoutUrl: pref.checkoutUrl };
  }
}
