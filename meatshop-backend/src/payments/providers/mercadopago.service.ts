import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Customer, MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { PaymentMethod } from '../../orders/enums/payment-method.enum';

export type MercadoPagoSavedCard = {
  cardId: string;
  brand: string;
  lastFourDigits: string;
  holderName: string;
  expirationMonth: string;
  expirationYear: string;
};

export type MercadoPagoCheckoutItem = {
  orderId: number;
  amount: number;
  description: string;
};

export type MercadoPagoPaymentSnapshot = {
  externalReference: string | null;
  status: string | null;
  statusDetail: string | null;
  paymentTypeId: string | null;
  approvedAt: Date | null;
  transactionAmount: number | null;
  currencyId: string | null;
};

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly client: MercadoPagoConfig | null;

  constructor(private readonly config: ConfigService) {
    const accessToken = (this.config.get<string>('MP_ACCESS_TOKEN') || '').trim();
    this.client = accessToken
      ? new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } })
      : null;
  }

  async createPreference(params: {
    orderId: number;
    amount: number;
    description: string;
  }): Promise<{ preferenceId: string; checkoutUrl: string }> {
    return this.createCheckoutPreference({
      checkoutId: String(params.orderId),
      items: [params],
    });
  }

  async createCheckoutPreference(params: {
    checkoutId: string;
    items: MercadoPagoCheckoutItem[];
  }): Promise<{ preferenceId: string; checkoutUrl: string }> {
    const items = params.items.map((item) => {
      const amount = Number(item.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Invalid order amount for payment.');
      }
      return {
        id: String(item.orderId),
        title: item.description,
        quantity: 1,
        unit_price: amount,
        currency_id: 'BRL',
      };
    });
    if (items.length === 0) throw new BadRequestException('Checkout has no orders.');

    const frontendUrl = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000')
      .trim()
      .replace(/\/$/, '');
    const backendPublicUrl = (
      this.config.get<string>('BACKEND_PUBLIC_URL') || 'http://localhost:3001'
    )
      .trim()
      .replace(/\/$/, '');
    const webhookPath = (
      this.config.get<string>('BACKEND_WEBHOOK_PATH') || '/webhooks/mercadopago'
    ).trim();
    const notificationUrl = `${backendPublicUrl}${webhookPath.startsWith('/') ? webhookPath : `/${webhookPath}`}`;

    try {
      const response = await new Preference(this.ensureClient()).create({
        body: {
          items,
          external_reference: params.checkoutId,
          notification_url: notificationUrl,
          back_urls: {
            success: `${frontendUrl}?payment=success&checkoutId=${params.checkoutId}`,
            failure: `${frontendUrl}?payment=failure&checkoutId=${params.checkoutId}`,
            pending: `${frontendUrl}?payment=pending&checkoutId=${params.checkoutId}`,
          },
          auto_return: 'approved',
        },
      });
      const preferenceId = response.id;
      const checkoutUrl = response.init_point ?? response.sandbox_init_point;
      if (!preferenceId || !checkoutUrl) {
        throw new BadRequestException('Failed to create the Mercado Pago preference.');
      }
      this.logger.log(`Mercado Pago preference created for checkout ${params.checkoutId}`);
      return { preferenceId, checkoutUrl };
    } catch (error) {
      this.logger.error(
        'Mercado Pago preference error',
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException('Mercado Pago is unavailable. Try again.');
    }
  }

  async getPaymentSnapshot(paymentId: string): Promise<MercadoPagoPaymentSnapshot> {
    const response = await new Payment(this.ensureClient()).get({
      id: paymentId,
    });
    return {
      externalReference: response.external_reference ?? null,
      status: response.status ?? null,
      statusDetail: response.status_detail ?? null,
      paymentTypeId: response.payment_type_id ?? null,
      approvedAt: response.date_approved ? new Date(response.date_approved) : null,
      transactionAmount:
        typeof response.transaction_amount === 'number' ? response.transaction_amount : null,
      currencyId: response.currency_id ?? null,
    };
  }

  async createCustomer(email: string, name: string): Promise<string> {
    try {
      const response = await new Customer(this.ensureClient()).create({
        body: { email, first_name: name },
      });
      if (!response.id) throw new BadRequestException('Failed to create a Mercado Pago customer.');
      return response.id;
    } catch (error) {
      this.logger.error(
        'Mercado Pago createCustomer error',
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException('Mercado Pago is unavailable. Try again.');
    }
  }

  async saveCard(customerId: string, cardTokenId: string): Promise<MercadoPagoSavedCard> {
    try {
      const response = await new Customer(this.ensureClient()).createCard({
        customerId,
        body: { token: cardTokenId },
      });
      if (!response.id || !response.last_four_digits) {
        throw new BadRequestException('Invalid or expired card token.');
      }
      return {
        cardId: response.id,
        brand: response.payment_method?.id ?? 'desconhecida',
        lastFourDigits: response.last_four_digits,
        holderName: response.cardholder?.name ?? '',
        expirationMonth: String(response.expiration_month ?? '').padStart(2, '0'),
        expirationYear: String(response.expiration_year ?? ''),
      };
    } catch (error) {
      this.logger.error(
        'Mercado Pago saveCard error',
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Could not save the card.');
    }
  }

  async removeCard(customerId: string, cardId: string): Promise<void> {
    try {
      await new Customer(this.ensureClient()).removeCard({
        customerId,
        cardId,
      });
    } catch (error) {
      this.logger.error(
        'Mercado Pago removeCard error',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException('Could not remove the card.');
    }
  }

  mapPaymentMethod(paymentTypeId: string | null): PaymentMethod | undefined {
    if (!paymentTypeId) return undefined;
    const type = paymentTypeId.toLowerCase();
    if (type === 'pix') return PaymentMethod.PIX;
    if (type === 'credit_card') return PaymentMethod.CREDIT;
    if (type === 'debit_card') return PaymentMethod.DEBIT;
    if (type === 'ticket' || type.includes('bol')) return PaymentMethod.BANK_SLIP;
    if (type === 'account_money') return PaymentMethod.MERCADO_PAGO_BALANCE;
    return undefined;
  }

  private ensureClient(): MercadoPagoConfig {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Mercado Pago is not configured: set MP_ACCESS_TOKEN in the environment.',
      );
    }
    return this.client;
  }
}
