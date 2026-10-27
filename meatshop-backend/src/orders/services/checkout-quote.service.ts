import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { CheckoutQuoteGroupDto } from '../dtos/checkout-quote-response.dto';
import type { Address } from '../../users/entities/address.entity';

@Injectable()
export class CheckoutQuoteService {
  constructor(private readonly config: ConfigService) {}

  private digest(
    userId: number,
    dto: CreateOrderDto,
    items: CartItem[],
    groups: CheckoutQuoteGroupDto[],
    address: Address | null = null,
  ): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          userId,
          ...this.selection(dto),
          destination: address
            ? [
                address.id,
                address.street,
                address.number,
                address.complement,
                address.neighborhood,
                address.city,
                address.state,
                address.zip_code,
                address.latitude,
                address.longitude,
                address.coordinate_source,
              ]
            : null,
          items: [...items]
            .sort((a, b) => a.product_id - b.product_id)
            .map((i) => [
              i.product_id,
              Number(i.quantity),
              Number(i.product.price),
              Number(i.unit_price ?? i.product.price),
              i.product.unit_of_measure,
            ]),
          groups: [...groups]
            .sort((a, b) => a.unit_id - b.unit_id)
            .map((g) => [g.unit_id, g.subtotal, g.discount_amount, g.delivery_fee, g.total_amount]),
        }),
      )
      .digest('hex');
  }

  private selection(dto: CreateOrderDto) {
    return {
      delivery: dto.delivery_type,
      deliveryTypes: [...(dto.unit_delivery_types ?? [])]
        .sort((a, b) => a.unit_id - b.unit_id)
        .map((value) => [value.unit_id, value.delivery_type]),
      address: dto.address_id ?? null,
      scheduled: dto.scheduled_delivery_date ?? null,
      method: dto.payment_method,
      change: dto.change_for ?? null,
      coupon: dto.coupon_code ?? null,
      coupons: [...(dto.coupon_codes ?? [])]
        .sort((a, b) => a.unit_id - b.unit_id)
        .map((c) => [c.unit_id, c.code]),
      methods: [...(dto.unit_payment_methods ?? [])]
        .sort((a, b) => a.unit_id - b.unit_id)
        .map((m) => [m.unit_id, m.method, m.change_for ?? null]),
    };
  }

  requestHash(dto: CreateOrderDto) {
    return createHash('sha256')
      .update(
        JSON.stringify({
          ...this.selection(dto),
          total: dto.expected_total,
          quote: dto.quote_token?.split('.')[1],
        }),
      )
      .digest('hex');
  }

  issue(
    userId: number,
    dto: CreateOrderDto,
    items: CartItem[],
    groups: CheckoutQuoteGroupDto[],
    address: Address | null = null,
  ) {
    const expiresAt = Date.now() + 5 * 60_000;
    const value = `${expiresAt}.${this.digest(userId, dto, items, groups, address)}`;
    return {
      quote_token: `${value}.${this.sign(value)}`,
      quote_expires_at: new Date(expiresAt).toISOString(),
    };
  }

  assertCurrent(
    token: string | undefined,
    userId: number,
    dto: CreateOrderDto,
    items: CartItem[],
    groups: CheckoutQuoteGroupDto[],
    address: Address | null = null,
  ) {
    const [expires, digest, signature, ...extra] = (token ?? '').split('.');
    const expected = this.sign(`${expires}.${digest}`);
    if (
      extra.length ||
      !/^\d+$/.test(expires ?? '') ||
      Number(expires) <= Date.now() ||
      !/^[0-9a-f]{64}$/.test(signature ?? '') ||
      !timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex')) ||
      digest !== this.digest(userId, dto, items, groups, address)
    ) {
      throw new BadRequestException({
        code: 'QUOTE_CHANGED',
        message: 'Revise a cotação atualizada antes de confirmar o pedido.',
      });
    }
  }

  private sign(value: string) {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(`checkout-quote:${value}`)
      .digest('hex');
  }
}
