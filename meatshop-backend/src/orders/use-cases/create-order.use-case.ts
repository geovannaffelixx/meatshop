import { isValidProductQuantity } from '../../cart/services/product-availability.policy';
import { SellerAccountsService } from '../../payments/seller-accounts.service';
import { isOfflinePayment } from '../../payments/payment-policy';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { Cart } from '../../cart/entities/cart.entity';
import { CartAccessService } from '../../cart/services/cart-access.service';
import { SendOrderStatusNotificationUseCase } from '../../notifications/use-cases/send-order-status-notification.use-case';
import { CouponRedemptionService } from '../../promotions/services/coupon-redemption.service';
import { Stock } from '../../products/entities/stock.entity';
import { Address } from '../../users/entities/address.entity';
import { User } from '../../users/entities/user.entity';
import { Unit } from '../../units/entities/unit.entity';
import { CheckoutResponseDto } from '../dtos/checkout-response.dto';
import { CreateOrderDto, paymentForUnit, deliveryForUnit } from '../dtos/create-order.dto';
import { CheckoutQuoteService } from '../services/checkout-quote.service';
import { OrderResponseDto } from '../dtos/order-response.dto';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderStatusHistory } from '../entities/order-status-history.entity';
import { Payment } from '../entities/payment.entity';
import { DeliveryStatus } from '../enums/delivery-status.enum';
import { DeliveryType } from '../enums/delivery-type.enum';
import {
  CheckoutPricingService,
  ICheckoutGroup,
  IOrderAmounts,
} from '../services/checkout-pricing.service';
import { DeliveryCodeService } from '../services/delivery-code.service';
import { SchedulingAvailabilityService } from '../services/scheduling-availability.service';
import { PromotionalPriceService } from '../../promotions/services/promotional-price.service';
import { CheckoutUnitPolicyService } from '../services/checkout-unit-policy.service';
import { ConfigService } from '@nestjs/config';

type CreatedOrder = {
  order: Order;
  deliveryCode: string | null;
};

@Injectable()
export class CreateOrderUseCase {
  private readonly logger = new Logger(CreateOrderUseCase.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly cartAccessService: CartAccessService,
    private readonly couponRedemption: CouponRedemptionService,
    private readonly pricing: CheckoutPricingService,
    private readonly schedulingAvailability: SchedulingAvailabilityService,
    private readonly sendOrderStatusNotificationUseCase: SendOrderStatusNotificationUseCase,
    private readonly deliveryCodeService: DeliveryCodeService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly mp: SellerAccountsService,
    private readonly quotes: CheckoutQuoteService,
    private readonly promotions: PromotionalPriceService,
    private readonly unitPolicy: CheckoutUnitPolicyService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    dto: CreateOrderDto,
    currentUser: User,
    checkoutId: string,
  ): Promise<CheckoutResponseDto> {
    this.assertCheckoutId(checkoutId);
    const existing = await this.findCheckout(currentUser.id, checkoutId);
    if (existing.length > 0) {
      this.assertReplay(existing, dto);
      return this.toResponse(checkoutId, existing);
    }

    if (!dto.payment_method) throw new BadRequestException('Choose a payment method');
    if (dto.change_for != null && dto.payment_method !== PaymentMethod.CASH)
      throw new BadRequestException('Change is only available for cash');
    const cart = await this.cartAccessService.getOrCreateCart(currentUser.id);

    const transaction = await this.dataSource.transaction((manager) =>
      this.performCheckout(manager, dto, currentUser, checkoutId, cart.id),
    );

    if (!transaction.replay) {
      await Promise.all(transaction.results.map((result) => this.notify(result)));
    }
    return this.toResponse(
      checkoutId,
      transaction.results.map((result) => result.order),
    );
  }

  private async lockCheckout(
    manager: EntityManager,
    checkoutId: string,
    user: User,
    cartId: number,
  ) {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`checkout:${checkoutId}`]);
    const owner = await manager.findOne(Order, { where: { checkout_id: checkoutId } });
    if (owner && owner.client_id !== user.id)
      throw new BadRequestException('Idempotency key is already in use');
    await manager
      .getRepository(Cart)
      .createQueryBuilder('cart')
      .setLock('pessimistic_write')
      .where('cart.id = :cartId', { cartId })
      .getOne();
  }

  private async prepareCheckout(
    manager: EntityManager,
    dto: CreateOrderDto,
    user: User,
    cartId: number,
  ) {
    const items = await this.loadItems(manager, cartId);
    this.assertCart(items);
    await this.promotions.applyCurrentPrices(items, manager);
    const groups = this.pricing.group(items, dto);
    await this.unitPolicy.assertAvailable(
      groups.map((g) => g.unitId),
      Boolean(dto.scheduled_delivery_date),
      manager,
    );
    await this.validateSchedule(dto, groups, manager);
    for (const group of groups)
      if (!isOfflinePayment(paymentForUnit(dto, group.unitId).method))
        await this.mp.assertAcceptingPayments(group.unitId, manager);
    if (dto.change_for != null && groups.length > 1)
      throw new BadRequestException('Use exact cash for a multi-unit checkout');
    const address = await this.resolveAddress(manager, dto, user.id);

    return { items, groups, address };
  }

  private assertCheckoutQuote(
    dto: CreateOrderDto,
    userId: number,
    items: CartItem[],
    results: CreatedOrder[],
    address: Address | null,
  ) {
    this.quotes.assertCurrent(
      dto.quote_token,
      userId,
      dto,
      items,
      results.map(({ order }) => ({
        unit_id: order.unit_id,
        subtotal: Number(order.subtotal),
        discount_amount: Number(order.discount_amount),
        delivery_fee: Number(order.delivery_fee),
        total_amount: Number(order.total_amount),
      })),
      address,
    );
    if (
      dto.expected_total == null ||
      Math.round(dto.expected_total * 100) !==
        Math.round(
          results.reduce((sum, result) => sum + Number(result.order.total_amount), 0) * 100,
        )
    )
      throw new BadRequestException({
        code: 'QUOTE_CHANGED',
        message: 'Order total changed. Review the updated quote before confirming.',
      });
  }

  private async performCheckout(
    manager: EntityManager,
    dto: CreateOrderDto,
    user: User,
    checkoutId: string,
    cartId: number,
  ) {
    await this.lockCheckout(manager, checkoutId, user, cartId);
    const retry = await manager.find(Order, {
      where: { client_id: user.id, checkout_id: checkoutId },
      order: { unit_id: 'ASC' },
    });
    if (retry.length > 0) {
      this.assertReplay(retry, dto);
      return {
        results: retry.map((order) => ({ order, deliveryCode: null })),
        replay: true,
      };
    }

    const { items, groups, address } = await this.prepareCheckout(manager, dto, user, cartId);
    const results: CreatedOrder[] = [];
    for (const group of groups) {
      results.push(await this.createUnitOrder(manager, dto, user, checkoutId, group, address));
    }
    this.assertCheckoutQuote(dto, user.id, items, results, address);
    await this.reserveStock(manager, items);
    await manager.delete(CartItem, { cart_id: cartId });
    return { results, replay: false };
  }

  private async createUnitOrder(
    manager: EntityManager,
    dto: CreateOrderDto,
    user: User,
    checkoutId: string,
    group: ICheckoutGroup,
    address: Address | null,
  ): Promise<CreatedOrder> {
    const prepared = await this.couponRedemption.prepare(
      group.couponCode,
      { userId: user.id, unitId: group.unitId, subtotal: group.subtotal },
      manager,
    );
    const selection = paymentForUnit(dto, group.unitId);
    const amounts = await this.unitAmounts(
      manager,
      dto,
      group,
      address,
      prepared?.discountAmount ?? 0,
    );
    const scheduledDate = dto.scheduled_delivery_date
      ? new Date(dto.scheduled_delivery_date)
      : null;
    const order = await manager.save(
      Order,
      manager.create(
        Order,
        this.orderPayload(dto, user, checkoutId, group, address, prepared, amounts, scheduledDate),
      ),
    );

    let deliveryCode: string | null = null;
    deliveryCode = this.deliveryCodeService.issue(order, 'DELIVERY');
    await manager.save(Order, order);

    await this.reserveOrderItems(manager, order, group);
    await this.recordOrderPayment(manager, order, selection.method, amounts.total_amount, user.id);
    await this.couponRedemption.consume(
      prepared,
      order.id,
      { userId: user.id, unitId: group.unitId, subtotal: group.subtotal },
      manager,
    );
    return { order, deliveryCode };
  }

  private async unitAmounts(
    manager: EntityManager,
    dto: CreateOrderDto,
    group: ICheckoutGroup,
    address: Address | null,
    discount: number,
  ) {
    const selection = paymentForUnit(dto, group.unitId);
    const deliveryType = deliveryForUnit(dto, group.unitId);
    if (selection.change_for != null && selection.method !== PaymentMethod.CASH)
      throw new BadRequestException('Troco disponível somente para dinheiro.');
    const amounts = this.pricing.amounts(
      group.subtotal,
      discount,
      deliveryType,
      this.pricing.deliveryFee(
        await manager.findOneByOrFail(Unit, { id: group.unitId }),
        address,
        deliveryType,
        dto.scheduled_delivery_date ? new Date(dto.scheduled_delivery_date) : new Date(),
      ),
    );
    if (selection.change_for != null && selection.change_for < amounts.total_amount)
      throw new BadRequestException('Change amount must cover the order total');
    return amounts;
  }

  private paymentDeadline(method: PaymentMethod | undefined, scheduledDate: Date | null): Date {
    const timeout = Number(this.config.get<string>('ORDER_CONFIRMATION_TIMEOUT_MINUTES', '30'));
    return isOfflinePayment(method)
      ? (scheduledDate ?? new Date(Date.now() + timeout * 60_000))
      : new Date(Date.now() + 30 * 60_000);
  }

  private destinationSnapshot(address: Address | null): Order['destination_snapshot'] {
    if (!address) return null;
    return {
      street: address.street,
      number: address.number,
      complement: address.complement,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zip_code: address.zip_code,
      latitude: address.latitude,
      longitude: address.longitude,
      coordinate_source: address.coordinate_source,
    };
  }

  private orderPayload(
    dto: CreateOrderDto,
    user: User,
    checkoutId: string,
    group: ICheckoutGroup,
    address: Address | null,
    prepared: Awaited<ReturnType<CouponRedemptionService['prepare']>>,
    amounts: IOrderAmounts,
    scheduledDate: Date | null,
  ): Partial<Order> {
    const selection = paymentForUnit(dto, group.unitId);
    const deliveryType = deliveryForUnit(dto, group.unitId);
    return {
      checkout_id: checkoutId,
      checkout_request_hash: this.quotes.requestHash(dto),
      change_for: selection.change_for ?? null,
      payment_due_at: this.paymentDeadline(selection.method, scheduledDate),
      payment_status: amounts.total_amount === 0 ? PaymentStatus.PAID : PaymentStatus.PENDING,
      status: amounts.total_amount === 0 ? OrderStatus.CONFIRMED : OrderStatus.PENDING,
      client_id: user.id,
      unit_id: group.unitId,
      delivery_type: deliveryType,
      delivery_status:
        deliveryType === DeliveryType.DELIVERY ? DeliveryStatus.WAITING_DELIVERY_PERSON : null,
      address_id: deliveryType === DeliveryType.DELIVERY ? (address?.id ?? null) : null,
      destination_snapshot:
        deliveryType === DeliveryType.DELIVERY ? this.destinationSnapshot(address) : null,
      coupon_id: prepared?.coupon.id ?? null,
      scheduled_delivery_date: scheduledDate,
      is_scheduled: scheduledDate !== null,
      ...amounts,
    };
  }

  private async reserveOrderItems(manager: EntityManager, order: Order, group: ICheckoutGroup) {
    await manager.save(
      OrderItem,
      group.items.map((item) =>
        manager.create(OrderItem, {
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product_snapshot: {
            name: item.product.name,
            unit_of_measure: item.product.unit_of_measure,
            image_url: item.product.image_url,
          },
        }),
      ),
    );
  }

  private async reserveStock(manager: EntityManager, items: CartItem[]): Promise<void> {
    // Lock only after preparing the order, keeping stock contention inside a short critical section.
    await this.lockAndValidateStock(manager, items);
    for (const item of items) {
      await manager.decrement(Stock, { product_id: item.product_id }, 'quantity', item.quantity);
    }
  }

  private async recordOrderPayment(
    manager: EntityManager,
    order: Order,
    method: PaymentMethod | undefined,
    total: number,
    userId: number,
  ) {
    await manager.save(
      Payment,
      manager.create(Payment, {
        order_id: order.id,
        method: method ?? null,
        status: total === 0 ? PaymentStatus.PAID : PaymentStatus.PENDING,
        payment_date: total === 0 ? new Date() : null,
      }),
    );
    await manager.save(
      OrderStatusHistory,
      manager.create(OrderStatusHistory, {
        order_id: order.id,
        status: order.status,
        updated_by: userId,
      }),
    );
  }

  private async loadItems(manager: EntityManager, cartId: number): Promise<CartItem[]> {
    return manager.find(CartItem, {
      where: { cart_id: cartId },
      relations: ['product', 'product.category'],
      order: { product_id: 'ASC' },
    });
  }

  private assertCart(items: CartItem[]): void {
    if (items.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_CART',
        message: 'The cart is empty.',
      });
    }
    const unavailable = items.filter(
      (item) =>
        !item.product.active ||
        !item.product.category?.active ||
        !isValidProductQuantity(item.product, Number(item.quantity)),
    );
    if (unavailable.length > 0) {
      throw new BadRequestException({
        code: 'PRODUCT_UNAVAILABLE',
        message: `Unavailable products: ${unavailable.map((item) => item.product.name).join(', ')}.`,
      });
    }
  }

  private async lockAndValidateStock(manager: EntityManager, items: CartItem[]): Promise<void> {
    const productIds = [...new Set(items.map((item) => item.product_id))].sort((a, b) => a - b);
    const stocks = await manager
      .getRepository(Stock)
      .createQueryBuilder('stock')
      .setLock('pessimistic_write')
      .where('stock.product_id IN (:...productIds)', { productIds })
      .orderBy('stock.product_id', 'ASC')
      .getMany();
    const byProduct = new Map(stocks.map((stock) => [stock.product_id, Number(stock.quantity)]));
    const insufficient = items.filter(
      (item) => (byProduct.get(item.product_id) ?? 0) < Number(item.quantity),
    );
    if (insufficient.length > 0) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_STOCK',
        message: `Insufficient stock: ${insufficient.map((item) => item.product.name).join(', ')}.`,
      });
    }
  }

  private async resolveAddress(
    manager: EntityManager,
    dto: CreateOrderDto,
    userId: number,
  ): Promise<Address | null> {
    if (
      dto.delivery_type !== DeliveryType.DELIVERY &&
      !dto.unit_delivery_types?.some((value) => value.delivery_type === DeliveryType.DELIVERY)
    )
      return null;
    const address = await manager.findOne(Address, {
      where: { id: dto.address_id, user_id: userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  private async validateSchedule(
    dto: CreateOrderDto,
    groups: ICheckoutGroup[],
    manager: EntityManager,
  ): Promise<void> {
    if (!dto.scheduled_delivery_date) return;
    const date = new Date(dto.scheduled_delivery_date);
    if (date <= new Date()) {
      throw new BadRequestException('scheduled_delivery_date must be in the future');
    }
    const unitIds = [...new Set(groups.map((group) => group.unitId))].sort((a, b) => a - b);
    for (const unitId of unitIds) {
      await this.schedulingAvailability.assertAvailable(unitId, date, manager);
    }
  }

  private async findCheckout(userId: number, checkoutId: string): Promise<Order[]> {
    return this.orderRepository
      .createQueryBuilder('order')
      .addSelect('order.delivery_code_ciphertext')
      .leftJoinAndSelect('order.unit', 'unit')
      .where('order.client_id = :userId', { userId })
      .andWhere('order.checkout_id = :checkoutId', { checkoutId })
      .orderBy('order.unit_id', 'ASC')
      .getMany();
  }

  async recover(checkoutId: string, user: User) {
    this.assertCheckoutId(checkoutId);
    const orders = await this.findCheckout(user.id, checkoutId);
    return orders.length ? this.toResponse(checkoutId, orders) : null;
  }

  private async toResponse(checkoutId: string, orders: Order[]): Promise<CheckoutResponseDto> {
    const detailed = await Promise.all(
      orders.map(async (order) => {
        const [persistedOrder, items, payment] = await Promise.all([
          this.orderRepository
            .createQueryBuilder('order')
            .addSelect('order.delivery_code_ciphertext')
            .leftJoinAndSelect('order.unit', 'unit')
            .where('order.id = :orderId', { orderId: order.id })
            .getOneOrFail(),
          this.orderItemRepository.find({
            where: { order_id: order.id },
            relations: ['product'],
          }),
          this.paymentRepository.findOne({ where: { order_id: order.id } }),
        ]);
        return OrderResponseDto.fromEntity(
          persistedOrder,
          items,
          payment,
          this.deliveryCodeService.revealDeliveryCode(persistedOrder),
        );
      }),
    );
    return {
      checkout_id: checkoutId,
      orders: detailed,
      total_amount: Number(detailed.reduce((sum, order) => sum + order.total_amount, 0).toFixed(2)),
    };
  }

  private async notify(result: CreatedOrder): Promise<void> {
    await this.sendOrderStatusNotificationUseCase
      .notifyUnitOfNewOrder(result.order)
      .catch((error: Error) =>
        this.logger.warn(`Failed to notify unit of new order ${result.order.id}: ${error.message}`),
      );
    if (!result.deliveryCode) return;
    await this.sendOrderStatusNotificationUseCase
      .notifyCustomerOfDeliveryCode(result.order, result.deliveryCode)
      .catch((error: Error) =>
        this.logger.warn(
          `Failed to notify customer of delivery code for order ${result.order.id}: ${error.message}`,
        ),
      );
  }

  private assertCheckoutId(value: string): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be a valid UUID v4.',
      });
    }
  }

  private assertReplay(orders: Order[], dto: CreateOrderDto) {
    if (
      orders.some(
        (o) => o.checkout_request_hash && o.checkout_request_hash !== this.quotes.requestHash(dto),
      )
    )
      throw new BadRequestException({
        code: 'IDEMPOTENCY_CONFLICT',
        message:
          'Esta tentativa já pertence a outra compra. Recupere o pedido antes de tentar novamente.',
      });
  }
}
