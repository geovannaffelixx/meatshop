import {
  BadRequestException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { Buffer } from 'buffer';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';

export type DeliveryCodePurpose = 'PICKUP' | 'DELIVERY';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class DeliveryCodeService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  issue(order: Order, purpose: DeliveryCodePurpose): string {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const hash = this.hash(order.id, purpose, code);
    const now = Date.now();

    if (purpose === 'PICKUP') {
      order.pickup_code_hash = hash;
      order.pickup_code_attempts = 0;
      order.pickup_code_locked_until = null;
      order.pickup_verified_at = null;
      order.pickup_code_expires_at = new Date(
        now + this.configNumber('PICKUP_CODE_TTL_MINUTES', 240) * 60_000,
      );
    } else {
      order.delivery_code_hash = hash;
      order.delivery_code_attempts = 0;
      order.delivery_code_locked_until = null;
      order.delivery_verified_at = null;
      const standardExpiry = now + this.configNumber('DELIVERY_CODE_TTL_HOURS', 72) * 3_600_000;
      const scheduledExpiry = order.scheduled_delivery_date
        ? order.scheduled_delivery_date.getTime() + 48 * 3_600_000
        : 0;
      order.delivery_code_expires_at = new Date(Math.max(standardExpiry, scheduledExpiry));
    }

    return code;
  }

  async verify(order: Order, purpose: DeliveryCodePurpose, code: string): Promise<void> {
    const fields = this.fields(order, purpose);
    const now = new Date();

    if (fields.verifiedAt) {
      throw new BadRequestException(
        purpose === 'PICKUP'
          ? 'Pickup code has already been verified'
          : 'Delivery code has already been verified',
      );
    }
    if (!fields.hash || !fields.expiresAt) {
      throw new BadRequestException('Verification code is not available');
    }
    if (fields.lockedUntil && fields.lockedUntil > now) {
      throw new HttpException(
        {
          code: 'DELIVERY_CODE_LOCKED',
          message: 'Muitas tentativas. Aguarde 15 minutos para tentar novamente.',
        },
        429,
      );
    }
    if (fields.expiresAt <= now) {
      throw new BadRequestException({
        code: 'DELIVERY_CODE_EXPIRED',
        message: 'O código expirou. Solicite um novo código.',
      });
    }

    const expected = Buffer.from(fields.hash, 'hex');
    const received = Buffer.from(this.hash(order.id, purpose, code), 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      this.applyFailedAttempt(order, purpose, fields.attempts + 1);
      await this.orderRepository.save(order);
      throw new UnauthorizedException({
        code: 'INVALID_DELIVERY_CODE',
        message: 'Código de segurança inválido.',
      });
    }

    if (purpose === 'PICKUP') {
      order.pickup_verified_at = now;
      order.pickup_code_attempts = 0;
      order.pickup_code_locked_until = null;
    } else {
      order.delivery_verified_at = now;
      order.delivery_code_attempts = 0;
      order.delivery_code_locked_until = null;
    }
    await this.orderRepository.save(order);
  }

  clearPickup(order: Order): void {
    order.pickup_code_hash = null;
    order.pickup_code_expires_at = null;
    order.pickup_code_attempts = 0;
    order.pickup_code_locked_until = null;
    order.pickup_verified_at = null;
  }

  private fields(order: Order, purpose: DeliveryCodePurpose) {
    return purpose === 'PICKUP'
      ? {
          hash: order.pickup_code_hash,
          expiresAt: order.pickup_code_expires_at,
          attempts: order.pickup_code_attempts,
          lockedUntil: order.pickup_code_locked_until,
          verifiedAt: order.pickup_verified_at,
        }
      : {
          hash: order.delivery_code_hash,
          expiresAt: order.delivery_code_expires_at,
          attempts: order.delivery_code_attempts,
          lockedUntil: order.delivery_code_locked_until,
          verifiedAt: order.delivery_verified_at,
        };
  }

  private applyFailedAttempt(order: Order, purpose: DeliveryCodePurpose, attempts: number): void {
    const shouldLock = attempts >= MAX_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
    const storedAttempts = shouldLock ? 0 : attempts;

    if (purpose === 'PICKUP') {
      order.pickup_code_attempts = storedAttempts;
      order.pickup_code_locked_until = lockedUntil;
    } else {
      order.delivery_code_attempts = storedAttempts;
      order.delivery_code_locked_until = lockedUntil;
    }
  }

  private hash(orderId: number, purpose: DeliveryCodePurpose, code: string): string {
    const secret =
      this.configService.get<string>('DELIVERY_CODE_SECRET') ||
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    return createHmac('sha256', secret).update(`${orderId}:${purpose}:${code}`).digest('hex');
  }

  private configNumber(name: string, fallback: number): number {
    const value = Number(this.configService.get<string>(name, String(fallback)));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
