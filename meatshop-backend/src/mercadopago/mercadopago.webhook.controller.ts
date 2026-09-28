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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'crypto';
import { Buffer } from 'buffer';
import { PaymentLifecycleService } from '../payments/payment-lifecycle.service';
import { Public } from '../common/decorators/public.decorator';
@ApiTags('Payments')
@Controller('webhooks')
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(
    private readonly lifecycle: PaymentLifecycleService,
    private readonly config: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'Receives official Mercado Pago payment notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification processed or deduplicated',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired signature' })
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
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const unitId = Number(query.unit_id);
    if (!Number.isSafeInteger(unitId) || unitId <= 0)
      throw new UnauthorizedException('Seller identity required');
    await this.lifecycle.process(paymentId, unitId);
    return { ok: true };
  }

  private extractPaymentId(query: Record<string, unknown>, body: unknown): string | null {
    const payload = this.asRecord(body);
    const data = this.asRecord(payload?.data);
    const raw = query['data.id'] ?? data?.id ?? query.id;
    const id = raw === undefined || raw === null ? '' : String(raw).trim();
    return /^[0-9]+$/.test(id) ? id : null;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  }

  private verifyIfConfigured(paymentId: string, xSignature?: string, xRequestId?: string): boolean {
    const secret = (this.config.get<string>('MP_WEBHOOK_SECRET') || '').trim();
    if (!secret) {
      this.logger.error('MP_WEBHOOK_SECRET is not configured; webhook rejected.');
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
    if (Math.abs(Date.now() / 1000 - (ts.length > 10 ? Number(ts) / 1000 : Number(ts))) > tolerance)
      return false;

    const manifest = `id:${params.paymentId};request-id:${params.xRequestId};ts:${ts};`;
    const expected = createHmac('sha256', params.secret).update(manifest).digest('hex');
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  }
}
