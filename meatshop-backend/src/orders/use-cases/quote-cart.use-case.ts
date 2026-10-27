import { isValidProductQuantity } from '../../cart/services/product-availability.policy';
import { SellerAccountsService } from '../../payments/seller-accounts.service';
import { isOfflinePayment } from '../../payments/payment-policy';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { CartAccessService } from '../../cart/services/cart-access.service';
import { CouponRedemptionService } from '../../promotions/services/coupon-redemption.service';
import { Address } from '../../users/entities/address.entity';
import { User } from '../../users/entities/user.entity';
import { Unit } from '../../units/entities/unit.entity';
import { CheckoutQuoteResponseDto } from '../dtos/checkout-quote-response.dto';
import { CreateOrderDto, paymentForUnit, deliveryForUnit } from '../dtos/create-order.dto';
import { CheckoutQuoteService } from '../services/checkout-quote.service';
import { DeliveryType } from '../enums/delivery-type.enum';
import { CheckoutPricingService, ICheckoutGroup } from '../services/checkout-pricing.service';
import { SchedulingAvailabilityService } from '../services/scheduling-availability.service';
import { StockAvailabilityValidator } from '../validators/stock-availability.validator';
import { PromotionalPriceService } from '../../promotions/services/promotional-price.service';
import { CheckoutUnitPolicyService } from '../services/checkout-unit-policy.service';

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
    private readonly promotions: PromotionalPriceService,
    private readonly unitPolicy: CheckoutUnitPolicyService,
  ) {}

  async execute(dto: CreateOrderDto, user: User): Promise<CheckoutQuoteResponseDto> {
    if (!dto.payment_method) throw new BadRequestException('Choose a payment method');
    const items = await this.loadItems(user.id);
    const address = await this.resolveAddress(dto, user.id);
    await this.stock.assertAvailable(
      items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product.name,
        quantity: item.quantity,
      })),
    );
    await this.promotions.applyCurrentPrices(items);
    const groups = this.pricing.group(items, dto);
    await this.validateAvailability(dto, items, groups);
    for (const group of groups) {
      if (!isOfflinePayment(paymentForUnit(dto, group.unitId).method))
        await this.sellers.forUnit(group.unitId, true);
    }
    const quoted = await this.dataSource.transaction(async (manager) => {
      const result = [];
      for (const group of groups)
        result.push(await this.quoteGroup(manager, dto, user, group, address, groups.length));
      return result;
    });
    return {
      ...this.quotes.issue(user.id, dto, items, quoted, address),
      groups: quoted,
      total_amount: Number(quoted.reduce((sum, group) => sum + group.total_amount, 0).toFixed(2)),
    };
  }

  private async loadItems(userId: number) {
    const cart = await this.cartAccess.getOrCreateCart(userId);
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
    return items;
  }

  private async resolveAddress(dto: CreateOrderDto, userId: number) {
    let address: Address | null = null;
    if (
      dto.delivery_type === DeliveryType.DELIVERY ||
      dto.unit_delivery_types?.some((value) => value.delivery_type === DeliveryType.DELIVERY)
    ) {
      address = await this.addresses.findOne({
        where: { id: dto.address_id, user_id: userId },
      });
      if (!address) throw new NotFoundException('Address not found');
    }
    return address;
  }

  private async validateAvailability(
    dto: CreateOrderDto,
    items: CartItem[],
    groups: ICheckoutGroup[],
  ) {
    await this.unitPolicy.assertAvailable(
      groups.map((g) => g.unitId),
      Boolean(dto.scheduled_delivery_date),
    );
    if (
      items.some(
        (i) =>
          !i.product.active ||
          !i.product.category?.active ||
          !isValidProductQuantity(i.product, Number(i.quantity)),
      )
    )
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
  }

  private async quoteGroup(
    manager: EntityManager,
    dto: CreateOrderDto,
    user: User,
    group: ICheckoutGroup,
    address: Address | null,
    groupCount: number,
  ) {
    const unit = await manager.getRepository(Unit).findOneByOrFail({ id: group.unitId });
    const deliveryType = deliveryForUnit(dto, group.unitId);
    const prepared = await this.coupons.prepare(
      group.couponCode,
      { userId: user.id, unitId: group.unitId, subtotal: group.subtotal },
      manager,
    );
    const quoted = {
      unit_id: group.unitId,
      items: this.quoteItems(group, unit),
      ...this.pricing.amounts(
        group.subtotal,
        prepared?.discountAmount ?? 0,
        deliveryType,
        this.pricing.deliveryFee(
          unit,
          address,
          deliveryType,
          dto.scheduled_delivery_date ? new Date(dto.scheduled_delivery_date) : new Date(),
        ),
      ),
    };
    this.assertChange(dto, group.unitId, quoted.total_amount, groupCount);
    return quoted;
  }

  private quoteItems(group: ICheckoutGroup, unit: Unit) {
    return group.items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product.name,
      product_image_url: i.product.image_url,
      unit_of_measure: i.product.unit_of_measure,
      unit_price: Number(i.unit_price),
      quantity: Number(i.quantity),
      unit_id: group.unitId,
      unit_name: unit.name,
      unit_image_url: unit.image_url,
    }));
  }

  private assertChange(dto: CreateOrderDto, unitId: number, total: number, groupCount: number) {
    const selection = paymentForUnit(dto, unitId);
    if (
      selection.change_for != null &&
      (selection.method !== 'Cash' ||
        selection.change_for < total ||
        (dto.change_for != null && groupCount > 1))
    )
      throw new BadRequestException({
        code: 'INVALID_CHANGE_AMOUNT',
        message: 'Informe troco suficiente para o total; em vários açougues utilize o valor exato.',
      });
  }
}
