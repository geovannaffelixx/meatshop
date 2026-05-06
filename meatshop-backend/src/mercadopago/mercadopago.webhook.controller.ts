import {
  Controller,
  Post,
  Body,
  Headers,
  Query,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import crypto from 'crypto';
import { Order } from '../orders/entities/order.entity';
import { MercadoPagoService } from '../payments/providers/mercadopago.service';
import { ConfigService } from '@nestjs/config';

@Controller('webhooks')
export class MercadoPagoWebhookController {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    private readonly mp: MercadoPagoService,
    private readonly config: ConfigService,
  ) {}

  @Post('mercadopago')
  @HttpCode(200)
  async handle(
    @Body() body: any,
    @Query() query: any,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    const paymentIdRaw = query?.id || query?.['data.id'] || body?.data?.id;

    if (!paymentIdRaw) return { ok: true, ignored: true, reason: 'missing_payment_id' };

    const paymentId = String(paymentIdRaw).trim();

    if (!/^\d+$/.test(paymentId)) {
      return { ok: true, ignored: true, reason: 'invalid_payment_id' };
    }

    const secret = (this.config.get<string>('MP_WEBHOOK_SECRET') || '').trim();
    if (secret) {
      const ok = this.verifySignature({
        secret,
        xSignature,
        xRequestId,
        paymentId,
      });

      if (!ok) throw new UnauthorizedException('Webhook signature inválida');
    }

    let payment: any;
    try {
      payment = await this.mp.getPayment(paymentId);
    } catch {
      return { ok: true, ignored: true, reason: 'payment_lookup_failed' };
    }

    const orderId = Number(payment?.external_reference);
    if (!orderId) return { ok: true, ignored: true, reason: 'missing_external_reference' };

    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) return { ok: true, ignored: true, reason: 'order_not_found' };

    const newStatus = payment?.status;
    const newStatusDetail = payment?.status_detail;

    const alreadySame =
      order.mpPaymentId === paymentId &&
      order.mpStatus === newStatus &&
      order.mpStatusDetail === newStatusDetail;

    if (alreadySame) {
      return { ok: true, duplicated: true };
    }

    order.mpPaymentId = paymentId;
    order.mpStatus = newStatus;
    order.mpStatusDetail = newStatusDetail;
    order.mpLastEventAt = new Date();

    if (newStatus === 'approved') {
      order.valorPago = Number(payment?.transaction_amount ?? order.valorPago ?? 0);
      order.mpPaidAt = payment?.date_approved ? new Date(payment.date_approved) : new Date();

      const method = this.mp.mapPaymentMethod(payment?.payment_type_id);
      if (method) order.paymentMethod = method as any;
    }

    try {
      await this.ordersRepo.save(order);
    } catch {
      return { ok: true, ignored: true, reason: 'db_save_failed' };
    }

    return { ok: true };
  }

  private verifySignature(params: {
    secret: string;
    xSignature?: string;
    xRequestId?: string;
    paymentId: string;
  }) {
    if (!params.xSignature || !params.xRequestId) return false;

    const parts = String(params.xSignature).split(',');
    let ts = '';
    let v1 = '';
    for (const part of parts) {
      const [k, val] = part.split('=');
      if (!k || !val) continue;
      const key = k.trim();
      const value = val.trim();
      if (key === 'ts') ts = value;
      if (key === 'v1') v1 = value;
    }
    if (!ts || !v1) return false;

    const manifest = `id:${params.paymentId};request-id:${params.xRequestId};ts:${ts};`;
    const hash = crypto.createHmac('sha256', params.secret).update(manifest).digest('hex');

    return hash === v1;
  }
}
