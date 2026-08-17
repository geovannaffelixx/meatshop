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
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../orders/entities/payment.entity';
import { PaymentStatus } from '../orders/enums/payment-status.enum';
import { ConfirmOrderUseCase } from '../orders/use-cases/confirm-order.use-case';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { MercadoPagoService } from '../payments/providers/mercadopago.service';

@Controller('webhooks')
export class MercadoPagoWebhookController {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Payment) private readonly paymentsRepo: Repository<Payment>,
    private readonly mp: MercadoPagoService,
    private readonly config: ConfigService,
    private readonly confirmOrderUseCase: ConfirmOrderUseCase,
  ) {}

  @Public()
  @Post('mercadopago')
  @HttpCode(200)
  async handle(
    @Body() body: any,
    @Query() query: any,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    const paymentId = this.extractPaymentId(query, body);
    if (!paymentId) return { ok: true, ignored: true, reason: 'missing_payment_id' };

    if (!this.verifyIfConfigured(paymentId, xSignature, xRequestId)) {
      throw new UnauthorizedException('Webhook signature inválida');
    }

    const mpPayment = await this.safeGetPayment(paymentId);
    if (!mpPayment) return { ok: true, ignored: true, reason: 'payment_lookup_failed' };

    const orderId = Number(mpPayment?.external_reference);
    if (!orderId) return { ok: true, ignored: true, reason: 'missing_external_reference' };

    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) return { ok: true, ignored: true, reason: 'order_not_found' };

    return this.applyPaymentUpdate(order, paymentId, mpPayment);
  }

  private extractPaymentId(query: any, body: any): string | null {
    const raw = query?.id || query?.['data.id'] || body?.data?.id;
    if (!raw) return null;
    const id = String(raw).trim();
    return /^\d+$/.test(id) ? id : null;
  }

  private verifyIfConfigured(
    paymentId: string,
    xSignature?: string,
    xRequestId?: string,
  ): boolean {
    const secret = (this.config.get<string>('MP_WEBHOOK_SECRET') || '').trim();
    if (!secret) return true;
    return this.verifySignature({ secret, xSignature, xRequestId, paymentId });
  }

  private async safeGetPayment(paymentId: string): Promise<any> {
    try {
      return await this.mp.getPayment(paymentId);
    } catch {
      return null;
    }
  }

  private async applyPaymentUpdate(order: Order, paymentId: string, mpPayment: any) {
    const payment = await this.getOrCreatePayment(order.id);
    const newStatusDetail = mpPayment?.status_detail ?? null;
    const isDuplicate =
      payment.transaction_id === paymentId &&
      payment.mp_status_detail === newStatusDetail;

    if (isDuplicate) return { ok: true, duplicated: true };

    payment.transaction_id = paymentId;
    payment.mp_status_detail = newStatusDetail;
    payment.mp_last_event_at = new Date();
    payment.status = this.mapMpStatus(mpPayment?.status);

    if (mpPayment?.status === 'approved') {
      this.applyApprovedPayment(payment, mpPayment);
    }

    try {
      await this.paymentsRepo.save(payment);
      await this.syncOrderPaymentStatus(order, payment.status);
    } catch {
      return { ok: true, ignored: true, reason: 'db_save_failed' };
    }

    return { ok: true };
  }

  private applyApprovedPayment(payment: Payment, mpPayment: any): void {
    payment.payment_date = mpPayment?.date_approved
      ? new Date(mpPayment.date_approved)
      : new Date();
    const method = this.mp.mapPaymentMethod(mpPayment?.payment_type_id);
    if (method) payment.method = method;
  }

  private async syncOrderPaymentStatus(
    order: Order,
    status: PaymentStatus,
  ): Promise<void> {
    order.payment_status = status;
    await this.ordersRepo.save(order);

    if (status === PaymentStatus.PAID && order.status === OrderStatus.PENDING) {
      await this.confirmOrderUseCase.execute(order.id, null);
    }
  }

  private async getOrCreatePayment(orderId: number): Promise<Payment> {
    const existing = await this.paymentsRepo.findOne({ where: { order_id: orderId } });
    return existing ?? this.paymentsRepo.create({ order_id: orderId });
  }

  private mapMpStatus(status: string | undefined): PaymentStatus {
    switch (status) {
      case 'approved':
        return PaymentStatus.PAID;
      case 'rejected':
        return PaymentStatus.REJECTED;
      case 'refunded':
      case 'charged_back':
        return PaymentStatus.REFUNDED;
      case 'cancelled':
        return PaymentStatus.CANCELLED;
      default:
        return PaymentStatus.PENDING;
    }
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
