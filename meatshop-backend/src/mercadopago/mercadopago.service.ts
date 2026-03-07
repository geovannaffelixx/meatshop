import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { PaymentMethod } from '../entities/order.entity';

@Injectable()
export class MercadoPagoService {
  private client: MercadoPagoConfig | null = null;

  constructor(private readonly config: ConfigService) {
    const accessToken = (this.config.get<string>('MP_ACCESS_TOKEN') || '').trim();

    if (!accessToken) {
      this.client = null;
      return;
    }

    this.client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 },
    });
  }

  private ensureClient() {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Mercado Pago não configurado: defina MP_ACCESS_TOKEN no ambiente.',
      );
    }
    return this.client;
  }

  async createPreference(params: { orderId: number; amount: number; description: string }) {
    const client = this.ensureClient();

    const amount = Number(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Valor do pedido inválido para pagamento (amount <= 0).');
    }

    const preference = new Preference(client);

    const frontendUrl = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000').trim();
    const backendPublicUrl = (
      this.config.get<string>('BACKEND_PUBLIC_URL') || 'http://localhost:3001'
    ).trim();

    const webhookPath = (
      this.config.get<string>('BACKEND_WEBHOOK_PATH') || '/webhooks/mercadopago'
    ).trim();

    const notificationUrl = `${backendPublicUrl}${webhookPath.startsWith('/') ? '' : '/'}${webhookPath}`;

    const backBase = `${frontendUrl}/`;

    const response = await preference.create({
      body: {
        items: [
          {
            id: String(params.orderId),
            title: params.description,
            quantity: 1,
            unit_price: amount,
            currency_id: 'BRL',
          },
        ],
        external_reference: String(params.orderId),
        notification_url: notificationUrl,
        back_urls: {
          success: `${backBase}?payment=success&orderId=${params.orderId}`,
          failure: `${backBase}?payment=failure&orderId=${params.orderId}`,
          pending: `${backBase}?payment=pending&orderId=${params.orderId}`,
        },
        auto_return: 'approved',
      },
    });

    const prefId = (response as any)?.id;
    const initPoint = (response as any)?.init_point;
    const sandboxInitPoint = (response as any)?.sandbox_init_point;

    if (!prefId || (!initPoint && !sandboxInitPoint)) {
      throw new BadRequestException('Falha ao criar preferência no Mercado Pago');
    }

    return {
      preferenceId: prefId,
      checkoutUrl: initPoint ?? sandboxInitPoint,
    };
  }

  async getPayment(paymentId: string) {
    const client = this.ensureClient();
    const payment = new Payment(client);
    return payment.get({ id: paymentId });
  }

  mapPaymentMethod(paymentTypeId: string | undefined): PaymentMethod | undefined {
    if (!paymentTypeId) return undefined;

    const t = paymentTypeId.toLowerCase();

    if (t === 'pix') return PaymentMethod.PIX;
    if (t === 'credit_card') return PaymentMethod.CREDITO;
    if (t === 'debit_card') return PaymentMethod.DEBITO;
    if (t === 'ticket' || t.includes('bol')) return PaymentMethod.BOLETO;
    if (t === 'account_money') return PaymentMethod.SALDO_MP;

    return undefined;
  }
}
