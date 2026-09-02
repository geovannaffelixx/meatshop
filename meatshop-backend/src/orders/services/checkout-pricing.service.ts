import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { Unit } from '../../units/entities/unit.entity';
import { Address } from '../../users/entities/address.entity';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { DeliveryType } from '../enums/delivery-type.enum';

export interface ICheckoutGroup {
  unitId: number;
  items: CartItem[];
  subtotal: number;
  couponCode?: string;
}

export interface IOrderAmounts {
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total_amount: number;
}

@Injectable()
export class CheckoutPricingService {
  constructor(private readonly config: ConfigService) {}

  group(items: CartItem[], dto: CreateOrderDto): ICheckoutGroup[] {
    const grouped = new Map<number, CartItem[]>();
    for (const item of items) {
      const unitId = item.product.unit_id;
      grouped.set(unitId, [...(grouped.get(unitId) ?? []), item]);
    }

    if (dto.coupon_code && grouped.size > 1) {
      throw new BadRequestException({
        code: 'COUPON_UNIT_REQUIRED',
        message: 'Em carrinhos com mais de uma unidade, informe o cupom por unidade.',
      });
    }

    const coupons = new Map(dto.coupon_codes?.map((coupon) => [coupon.unit_id, coupon.code]));
    for (const unitId of coupons.keys()) {
      if (!grouped.has(unitId)) {
        throw new BadRequestException({
          code: 'COUPON_UNIT_NOT_IN_CART',
          message: `A unidade ${unitId} não pertence ao carrinho atual.`,
        });
      }
    }

    return [...grouped.entries()]
      .sort(([left], [right]) => left - right)
      .map(([unitId, unitItems]) => ({
        unitId,
        items: unitItems,
        subtotal: this.roundMoney(
          unitItems.reduce(
            (sum, item) => sum + Number(item.product.price) * Number(item.quantity),
            0,
          ),
        ),
        couponCode: coupons.get(unitId) ?? dto.coupon_code,
      }));
  }

  amounts(
    subtotal: number,
    discount: number,
    deliveryType: DeliveryType,
    calculatedDeliveryFee?: number,
  ): IOrderAmounts {
    const deliveryFee =
      deliveryType === DeliveryType.DELIVERY
        ? (calculatedDeliveryFee ?? Number(this.config.get<string>('DEFAULT_DELIVERY_FEE', '0')))
        : 0;
    return {
      subtotal: this.roundMoney(subtotal),
      discount_amount: this.roundMoney(discount),
      delivery_fee: this.roundMoney(deliveryFee),
      total_amount: this.roundMoney(Math.max(0, subtotal - discount + deliveryFee)),
    };
  }

  deliveryFee(
    unit: Unit,
    address: Address | null,
    deliveryType: DeliveryType,
    at = new Date(),
  ): number {
    if (deliveryType !== DeliveryType.DELIVERY) return 0;
    const rawCoordinates = [unit.latitude, unit.longitude, address?.latitude, address?.longitude];
    if (rawCoordinates.some((value) => value === null || value === undefined)) {
      return Number(this.config.get<string>('DEFAULT_DELIVERY_FEE', '0'));
    }
    const coordinates = rawCoordinates.map(Number);
    if (coordinates.some((value) => !Number.isFinite(value))) {
      return Number(this.config.get<string>('DEFAULT_DELIVERY_FEE', '0'));
    }
    const [unitLat, unitLng, destinationLat, destinationLng] = coordinates;
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitudeDelta = toRadians(destinationLat - unitLat);
    const longitudeDelta = toRadians(destinationLng - unitLng);
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(unitLat)) *
        Math.cos(toRadians(destinationLat)) *
        Math.sin(longitudeDelta / 2) ** 2;
    const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    const base = Number(this.config.get<string>('DELIVERY_FEE_BASE', '3.20'));
    const perKm = Number(this.config.get<string>('DELIVERY_FEE_PER_KM', '1.10'));
    const threshold = Number(this.config.get<string>('DELIVERY_FEE_LONG_DISTANCE_KM', '8'));
    const surcharge = Number(this.config.get<string>('DELIVERY_FEE_LONG_DISTANCE_SURCHARGE', '2'));
    const peakMultiplier = Number(this.config.get<string>('DELIVERY_FEE_PEAK_MULTIPLIER', '1.3'));
    let fee = base + distanceKm * perKm;
    if (distanceKm > threshold) fee += surcharge;
    const isWeekend = at.getDay() === 0 || at.getDay() === 6;
    const isMealTime =
      (at.getHours() >= 11 && at.getHours() < 14) || (at.getHours() >= 18 && at.getHours() < 21);
    if (isWeekend && isMealTime) fee *= peakMultiplier;
    return this.roundMoney(fee);
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }
}
