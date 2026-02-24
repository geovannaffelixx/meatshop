import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { PaymentMethod } from '../entities/order.entity';

@Injectable()
export class MercadoPagoService {
  private client: MercadoPagoConfig;

  constructor(private readonly config: ConfigService) {
    const accessToken = this.config.get<string>('MP_ACCESS_TOKEN');

    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN não configurado');
    }

    this.client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 },
    });
  }

  /**
   * Cria preferência de pagamento no Mercado Pago (Checkout Pro)
   */
  async createPreference(params: { orderId: number; amount: number; description: string }) {
    const preference = new Preference(this.client);

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const backendPublicUrl =
      this.config.get<string>('BACKEND_PUBLIC_URL') || 'http://localhost:3001';

    const response = await preference.create({
      body: {
        items: [
          {
            id: String(params.orderId),
            title: params.description,
            quantity: 1,
            unit_price: Number(params.amount),
            currency_id: 'BRL',
          },
        ],
        external_reference: String(params.orderId),
        notification_url: `${backendPublicUrl}/webhooks/mercadopago`,
        back_urls: {
          success: `${frontendUrl}/payment/success?orderId=${params.orderId}`,
          failure: `${frontendUrl}/payment/failure?orderId=${params.orderId}`,
          pending: `${frontendUrl}/payment/pending?orderId=${params.orderId}`,
        },
        auto_return: 'approved',
      },
    });

    if (!response?.id || (!response.init_point && !response.sandbox_init_point)) {
      throw new BadRequestException('Falha ao criar preferência no Mercado Pago');
    }

    return {
      preferenceId: response.id,
      checkoutUrl: response.init_point ?? response.sandbox_init_point,
    };
  }

  /**
   * Consulta detalhes de um pagamento pelo ID
   */
  async getPayment(paymentId: string) {
    const payment = new Payment(this.client);
    return payment.get({ id: paymentId });
  }

  /**
   * Converte o payment_type_id do Mercado Pago
   * para o enum PaymentMethod do sistema
   */
  mapPaymentMethod(paymentTypeId: string | undefined): PaymentMethod | undefined {
    if (!paymentTypeId) return undefined;

    const t = paymentTypeId.toLowerCase();

    if (t === 'pix') return PaymentMethod.PIX;

    if (t === 'credit_card') return PaymentMethod.CREDITO;

    if (t === 'debit_card') return PaymentMethod.DEBITO;

    if (t === 'ticket' || t.includes('bol')) return PaymentMethod.BOLETO;

    if (t === 'account_money') return PaymentMethod.DINHEIRO;

    return undefined;
  }
}
