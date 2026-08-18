import {
  Injectable,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment, Customer } from 'mercadopago';
import { PaymentMethod } from '../../orders/enums/payment-method.enum';

export type MercadoPagoSavedCard = {
  cardId: string;
  brand: string;
  lastFourDigits: string;
  holderName: string;
  expirationMonth: string;
  expirationYear: string;
};

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
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

    const notificationUrl = `${backendPublicUrl}${webhookPath.startsWith('/') ? webhookPath : '/' + webhookPath}`;

    const backBase = frontendUrl.replace(/\/$/, '');

    let response;

    try {
      response = await preference.create({
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
    } catch (error) {
      this.logger.error('MercadoPago SDK error', error instanceof Error ? error.stack : undefined);
      throw error;
    }

    const prefId = (response as any)?.id ?? (response as any)?.body?.id;
    const initPoint = (response as any)?.init_point ?? (response as any)?.body?.init_point;

    const sandboxInitPoint =
      (response as any)?.sandbox_init_point ?? (response as any)?.body?.sandbox_init_point;

    if (!prefId || (!initPoint && !sandboxInitPoint)) {
      throw new BadRequestException('Falha ao criar preferência no Mercado Pago');
    }

    this.logger.log(`MercadoPago preference created for order ${params.orderId}`);
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

  async createCustomer(email: string, name: string): Promise<string> {
    const client = this.ensureClient();
    const customer = new Customer(client);

    let response;
    try {
      response = await customer.create({ body: { email, first_name: name } });
    } catch (error) {
      this.logger.error(
        'MercadoPago createCustomer error',
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Falha ao criar cliente no Mercado Pago');
    }

    if (!response.id) {
      throw new BadRequestException('Falha ao criar cliente no Mercado Pago');
    }

    return response.id;
  }

  async saveCard(customerId: string, cardTokenId: string): Promise<MercadoPagoSavedCard> {
    const client = this.ensureClient();
    const customer = new Customer(client);

    let response;
    try {
      response = await customer.createCard({
        customerId,
        body: { token: cardTokenId },
      });
    } catch (error) {
      this.logger.error(
        'MercadoPago saveCard error',
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        'Não foi possível salvar o cartão. Verifique os dados e tente novamente.',
      );
    }

    if (!response.id || !response.last_four_digits) {
      throw new BadRequestException(
        'Não foi possível salvar o cartão. Verifique os dados e tente novamente.',
      );
    }

    return {
      cardId: response.id,
      brand: response.payment_method?.id ?? 'desconhecida',
      lastFourDigits: response.last_four_digits,
      holderName: response.cardholder?.name ?? '',
      expirationMonth: String(response.expiration_month ?? '').padStart(2, '0'),
      expirationYear: String(response.expiration_year ?? ''),
    };
  }

  async removeCard(customerId: string, cardId: string): Promise<void> {
    const client = this.ensureClient();
    const customer = new Customer(client);

    try {
      await customer.removeCard({ customerId, cardId });
    } catch (error) {
      this.logger.error(
        'MercadoPago removeCard error',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Não foi possível remover o cartão no Mercado Pago. Tente novamente.',
      );
    }
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
