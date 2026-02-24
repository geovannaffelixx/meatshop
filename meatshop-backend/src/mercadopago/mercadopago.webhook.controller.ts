import { Controller, Post, Body, Headers, Query, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import crypto from 'crypto';
import { Order } from '../entities/order.entity';
import { MercadoPagoService } from './mercadopago.service';
import { ConfigService } from '@nestjs/config';

@Controller('webhooks')
export class MercadoPagoWebhookController {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    private readonly mp: MercadoPagoService,
    private readonly config: ConfigService,
  ) {}

  @Post('mercadopago')
  async handle(
    @Body() body: any,
    @Query() query: any,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    const paymentId = query?.id || query?.['data.id'] || body?.data?.id;

    if (!paymentId) return { ok: true, ignored: true };

    // ✅ (Opcional) validar assinatura, se MP_WEBHOOK_SECRET estiver configurado
    const secret = this.config.get<string>('MP_WEBHOOK_SECRET');
    if (secret) {
      const ok = this.verifySignature({
        secret,
        xSignature,
        xRequestId,
        paymentId: String(paymentId),
      });

      if (!ok) throw new UnauthorizedException('Webhook signature inválida');
    }

    // Sempre consultar o pagamento na API antes de atualizar
    const payment = await this.mp.getPayment(String(paymentId));

    const orderId = Number(payment.external_reference);
    if (!orderId) return { ok: true, ignored: true };

    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) return { ok: true, ignored: true };

    // ✅ Idempotência: se já processamos esse paymentId e status não mudou, só confirma.
    const newStatus = payment.status;
    const newStatusDetail = payment.status_detail;

    const alreadySame =
      order.mpPaymentId === String(paymentId) &&
      order.mpStatus === newStatus &&
      order.mpStatusDetail === newStatusDetail;

    if (alreadySame) {
      return { ok: true, duplicated: true };
    }

    order.mpPaymentId = String(paymentId);
    order.mpStatus = newStatus;
    order.mpStatusDetail = newStatusDetail;
    order.mpLastEventAt = new Date();

    // Se aprovado, marcar valorPago e mpPaidAt
    if (newStatus === 'approved') {
      order.valorPago = Number(payment.transaction_amount ?? order.valorPago ?? 0);
      order.mpPaidAt = payment.date_approved ? new Date(payment.date_approved) : new Date();

      // tenta mapear forma de pagamento
      const method = this.mp.mapPaymentMethod(payment.payment_type_id);
      if (method) order.paymentMethod = method as any;

      // ⚠️ seu status atual é “Pendente / Entregue / Cancelado”
      // Pagamento aprovado NÃO significa entregue automaticamente.
      // Então aqui eu recomendo manter Pendente e você entregar manualmente.
      // Se quiser, você pode mudar para um status “Pago” no futuro.
    }

    await this.ordersRepo.save(order);

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
