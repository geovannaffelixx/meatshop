import { SellerAccountsService } from '../../payments/seller-accounts.service';
import { isOfflinePayment } from '../../payments/payment-policy';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { CartAccessService } from '../../cart/services/cart-access.service';
import { CouponRedemptionService } from '../../promotions/services/coupon-redemption.service';
import { Address } from '../../users/entities/address.entity';
import { User } from '../../users/entities/user.entity';
import { Unit } from '../../units/entities/unit.entity';
import { CheckoutQuoteResponseDto } from '../dtos/checkout-quote-response.dto';
import { CreateOrderDto, paymentForUnit } from '../dtos/create-order.dto';
import { CheckoutQuoteService } from '../services/checkout-quote.service';
import { DeliveryType } from '../enums/delivery-type.enum';
import { CheckoutPricingService } from '../services/checkout-pricing.service';
import { SchedulingAvailabilityService } from '../services/scheduling-availability.service';
import { StockAvailabilityValidator } from '../validators/stock-availability.validator';

@Injectable()
export class QuoteCartUseCase {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItems: Repository<CartItem>,
    @InjectRepository(Address)
    private readonly addresses: Repository<Address>,
    @InjectRepository(Unit)
    private readonly units: Repository<Unit>,
    private readonly cartAccess: CartAccessService,
    private readonly pricing: CheckoutPricingService,
    private readonly coupons: CouponRedemptionService,
    private readonly stock: StockAvailabilityValidator,
    private readonly schedulingAvailability: SchedulingAvailabilityService,
    private readonly dataSource: DataSource,
    private readonly sellers: SellerAccountsService,
    private readonly quotes: CheckoutQuoteService,
  ) {}

  async execute(dto: CreateOrderDto, user: User): Promise<CheckoutQuoteResponseDto> {
    if (!dto.payment_method) throw new BadRequestException('Choose a payment method');
    const cart = await this.cartAccess.getOrCreateCart(user.id);
    const items = await this.cartItems.find({
      where: { cart_id: cart.id },
      relations: ['product', 'product.category'],
      order: { product_id: 'ASC' },
    });
    if (items.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_CART',
        message: 'The cart is empty.',
      });
    }
    let address: Address | null = null;
    if (dto.delivery_type === DeliveryType.DELIVERY) {
      address = await this.addresses.findOne({
        where: { id: dto.address_id, user_id: user.id },
      });
      if (!address) throw new NotFoundException('Address not found');
    }
    await this.stock.assertAvailable(
      items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product.name,
        quantity: item.quantity,
      })),
    );
    const groups = this.pricing.group(items, dto);
    if (items.some((i) => !i.product.active || !i.product.category?.active))
      throw new BadRequestException({
        code: 'PRODUCT_UNAVAILABLE',
        message: 'Há produtos indisponíveis no carrinho.',
      });
    if (dto.scheduled_delivery_date) {
      const date = new Date(dto.scheduled_delivery_date);
      if (date <= new Date()) throw new BadRequestException('Schedule must be in the future');
      await Promise.all(
        groups.map((group) => this.schedulingAvailability.assertAvailable(group.unitId, date)),
      );
    }

    for (const group of groups)
      if (!isOfflinePayment(paymentForUnit(dto, group.unitId).method))
        await this.sellers.forUnit(group.unitId, true);
    const quoted = await this.dataSource.transaction(async (manager) => {
      const result = [];
      for (const group of groups) {
        const unit = await this.units.findOneByOrFail({ id: group.unitId });
        const prepared = await this.coupons.prepare(
          group.couponCode,
          { userId: user.id, unitId: group.unitId, subtotal: group.subtotal },
          manager,
        );
        result.push({
          unit_id: group.unitId,
          items: group.items.map((i) => ({
            product_id: i.product_id,
            product_name: i.product.name,
            product_image_url: i.product.image_url,
            unit_of_measure: i.product.unit_of_measure,
            unit_price: Number(i.product.price),
            quantity: Number(i.quantity),
            unit_id: group.unitId,
            unit_name: unit.name,
            unit_image_url: unit.image_url,
          })),
          ...this.pricing.amounts(
            group.subtotal,
            prepared?.discountAmount ?? 0,
            dto.delivery_type,
            this.pricing.deliveryFee(
              unit,
              address,
              dto.delivery_type,
              dto.scheduled_delivery_date ? new Date(dto.scheduled_delivery_date) : new Date(),
            ),
          ),
        });
        const selection = paymentForUnit(dto, group.unitId);
        const total = result[result.length - 1].total_amount;
        if (
          selection.change_for != null &&
          (selection.method !== 'Cash' ||
            selection.change_for < total ||
            (dto.change_for != null && groups.length > 1))
        )
          throw new BadRequestException({
            code: 'INVALID_CHANGE_AMOUNT',
            message:
              'Informe troco suficiente para o total; em vários açougues utilize o valor exato.',
          });
      }
      return result;
    });
    return {
      ...this.quotes.issue(user.id, dto, items, quoted, address),
      groups: quoted,
      total_amount: Number(quoted.reduce((sum, group) => sum + group.total_amount, 0).toFixed(2)),
    };
  }
}
