import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'crypto';
import { Buffer } from 'buffer';
import { DataSource, EntityManager } from 'typeorm';
import { Public } from '../common/decorators/public.decorator';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../orders/entities/payment.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { PaymentStatus } from '../orders/enums/payment-status.enum';
import { ConfirmOrderUseCase } from '../orders/use-cases/confirm-order.use-case';
import {
  MercadoPagoPaymentSnapshot,
  MercadoPagoService,
} from '../payments/providers/mercadopago.service';

@ApiTags('Payments')
@Controller('webhooks')
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(
    private readonly mp: MercadoPagoService,
    private readonly config: ConfigService,
    private readonly confirmOrderUseCase: ConfirmOrderUseCase,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @ApiOperation({
    summary: 'Recebe notificações oficiais de pagamento do Mercado Pago',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificação processada ou deduplicada',
  })
  @ApiResponse({ status: 401, description: 'Assinatura inválida ou expirada' })
  @Public()
  @Post('mercadopago')
  @HttpCode(200)
  async handle(
    @Body() body: unknown,
    @Query() query: Record<string, unknown>,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    const paymentId = this.extractPaymentId(query, body);
    if (!paymentId) return { ok: true, ignored: true, reason: 'missing_payment_id' };
    if (!this.verifyIfConfigured(paymentId, xSignature, xRequestId)) {
      throw new UnauthorizedException('Webhook signature inválida');
    }

    let snapshot: MercadoPagoPaymentSnapshot;
    try {
      snapshot = await this.mp.getPaymentSnapshot(paymentId);
    } catch (error) {
      this.logger.warn(
        `Payment lookup failed for ${paymentId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return { ok: true, ignored: true, reason: 'payment_lookup_failed' };
    }
    if (!snapshot.externalReference) {
      return { ok: true, ignored: true, reason: 'missing_external_reference' };
    }

    const updated = await this.dataSource.transaction((manager) =>
      this.applyPaymentUpdate(manager, paymentId, snapshot),
    );
    for (const order of updated.ordersToConfirm) {
      await this.confirmOrderUseCase.execute(order.id, null);
    }
    return updated.duplicated ? { ok: true, duplicated: true } : { ok: true };
  }

  private async applyPaymentUpdate(
    manager: EntityManager,
    paymentId: string,
    snapshot: MercadoPagoPaymentSnapshot,
  ): Promise<{ duplicated: boolean; ordersToConfirm: Order[] }> {
    const orders = await this.findAndLockOrders(manager, snapshot.externalReference!);
    if (orders.length === 0) return { duplicated: false, ordersToConfirm: [] };

    const payments = await manager
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .setLock('pessimistic_write')
      .where('payment.order_id IN (:...orderIds)', {
        orderIds: orders.map((order) => order.id),
      })
      .getMany();
    const byOrder = new Map(payments.map((payment) => [payment.order_id, payment]));
    const status = this.mapMpStatus(snapshot.status);
    const expectedAmount = Number(
      orders.reduce((sum, order) => sum + Number(order.total_amount), 0).toFixed(2),
    );
    if (
      snapshot.currencyId !== 'BRL' ||
      snapshot.transactionAmount === null ||
      Math.abs(snapshot.transactionAmount - expectedAmount) >= 0.01
    ) {
      this.logger.error(
        `Payment ${paymentId} amount/currency mismatch for ${snapshot.externalReference}`,
      );
      return { duplicated: false, ordersToConfirm: [] };
    }
    const duplicate = orders.every((order) => {
      const payment = byOrder.get(order.id);
      return (
        payment?.transaction_id === paymentId &&
        payment.mp_status_detail === snapshot.statusDetail &&
        payment.status === status
      );
    });
    if (duplicate) return { duplicated: true, ordersToConfirm: [] };

    for (const order of orders) {
      const payment = byOrder.get(order.id) ?? manager.create(Payment, { order_id: order.id });
      if (
        payment.status === PaymentStatus.PAID &&
        (status === PaymentStatus.PENDING || status === PaymentStatus.REJECTED)
      ) {
        continue;
      }
      payment.transaction_id = paymentId;
      payment.mp_status_detail = snapshot.statusDetail;
      payment.mp_last_event_at = new Date();
      payment.status = status;
      if (status === PaymentStatus.PAID) {
        payment.payment_date = snapshot.approvedAt ?? new Date();
        payment.method = this.mp.mapPaymentMethod(snapshot.paymentTypeId) ?? payment.method;
      }
      order.payment_status = status;
      await manager.save(Payment, payment);
      await manager.save(Order, order);
    }
    return {
      duplicated: false,
      ordersToConfirm:
        status === PaymentStatus.PAID
          ? orders.filter((order) => order.status === OrderStatus.PENDING)
          : [],
    };
  }

  private findAndLockOrders(manager: EntityManager, reference: string): Promise<Order[]> {
    const query = manager
      .getRepository(Order)
      .createQueryBuilder('order')
      .setLock('pessimistic_write')
      .orderBy('order.id', 'ASC');
    return /^[0-9]+$/.test(reference)
      ? query.where('order.id = :id', { id: Number(reference) }).getMany()
      : query.where('order.checkout_id = :checkoutId', { checkoutId: reference }).getMany();
  }

  private extractPaymentId(query: Record<string, unknown>, body: unknown): string | null {
    const payload = this.asRecord(body);
    const data = this.asRecord(payload?.data);
    const raw = query.id ?? query['data.id'] ?? data?.id;
    const id = raw === undefined || raw === null ? '' : String(raw).trim();
    return /^[0-9]+$/.test(id) ? id : null;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  }

  private verifyIfConfigured(paymentId: string, xSignature?: string, xRequestId?: string): boolean {
    const secret = (this.config.get<string>('MP_WEBHOOK_SECRET') || '').trim();
    if (!secret) {
      this.logger.error('MP_WEBHOOK_SECRET não configurado; webhook rejeitado.');
      return false;
    }
    return this.verifySignature({ secret, xSignature, xRequestId, paymentId });
  }

  private verifySignature(params: {
    secret: string;
    xSignature?: string;
    xRequestId?: string;
    paymentId: string;
  }): boolean {
    if (!params.xSignature || !params.xRequestId) return false;
    const parts = new Map(
      params.xSignature.split(',').map((part) => {
        const separator = part.indexOf('=');
        return separator < 1
          ? ['', '']
          : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
      }),
    );
    const ts = parts.get('ts');
    const signature = parts.get('v1');
    if (!ts || !signature || !/^[0-9]+$/.test(ts) || !/^[0-9a-f]{64}$/i.test(signature)) {
      return false;
    }
    const tolerance = Number(this.config.get<string>('MP_WEBHOOK_TOLERANCE_SECONDS', '300'));
    if (Math.abs(Date.now() / 1000 - Number(ts)) > tolerance) return false;

    const manifest = `id:${params.paymentId};request-id:${params.xRequestId};ts:${ts};`;
    const expected = createHmac('sha256', params.secret).update(manifest).digest('hex');
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  }

  private mapMpStatus(status: string | null): PaymentStatus {
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
}
