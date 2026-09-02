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
import { CreateOrderDto } from '../dtos/create-order.dto';
import { OrderResponseDto } from '../dtos/order-response.dto';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderStatusHistory } from '../entities/order-status-history.entity';
import { Payment } from '../entities/payment.entity';
import { DeliveryStatus } from '../enums/delivery-status.enum';
import { DeliveryType } from '../enums/delivery-type.enum';
import { CheckoutPricingService, ICheckoutGroup } from '../services/checkout-pricing.service';
import { DeliveryCodeService } from '../services/delivery-code.service';
import { BusinessHoursValidator } from '../validators/business-hours.validator';

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
    private readonly businessHours: BusinessHoursValidator,
    private readonly sendOrderStatusNotificationUseCase: SendOrderStatusNotificationUseCase,
    private readonly deliveryCodeService: DeliveryCodeService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    dto: CreateOrderDto,
    currentUser: User,
    checkoutId: string,
  ): Promise<CheckoutResponseDto> {
    this.assertCheckoutId(checkoutId);
    const existing = await this.findCheckout(currentUser.id, checkoutId);
    if (existing.length > 0) {
      return this.toResponse(checkoutId, existing);
    }

    const cart = await this.cartAccessService.getOrCreateCart(currentUser.id);
    const previewItems = await this.loadItems(this.dataSource.manager, cart.id);
    this.assertCart(previewItems);
    const previewGroups = this.pricing.group(previewItems, dto);
    await this.validateSchedule(dto, previewGroups);

    const transaction = await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(Cart)
        .createQueryBuilder('cart')
        .setLock('pessimistic_write')
        .where('cart.id = :cartId', { cartId: cart.id })
        .getOne();

      const retry = await manager.find(Order, {
        where: { client_id: currentUser.id, checkout_id: checkoutId },
        order: { unit_id: 'ASC' },
      });
      if (retry.length > 0) {
        return {
          results: retry.map((order) => ({ order, deliveryCode: null })),
          replay: true,
        };
      }

      const items = await this.loadItems(manager, cart.id);
      this.assertCart(items);
      const groups = this.pricing.group(items, dto);
      await this.lockAndValidateStock(manager, items);
      const address = await this.resolveAddress(manager, dto, currentUser.id);

      const results: CreatedOrder[] = [];
      for (const group of groups) {
        results.push(
          await this.createUnitOrder(manager, dto, currentUser, checkoutId, group, address),
        );
      }
      await manager.delete(CartItem, { cart_id: cart.id });
      return { results, replay: false };
    });

    if (!transaction.replay) {
      await Promise.all(transaction.results.map((result) => this.notify(result)));
    }
    return this.toResponse(
      checkoutId,
      transaction.results.map((result) => result.order),
    );
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
    const amounts = this.pricing.amounts(
      group.subtotal,
      prepared?.discountAmount ?? 0,
      dto.delivery_type,
      this.pricing.deliveryFee(
        await manager.findOneByOrFail(Unit, { id: group.unitId }),
        address,
        dto.delivery_type,
        dto.scheduled_delivery_date ? new Date(dto.scheduled_delivery_date) : new Date(),
      ),
    );
    const scheduledDate = dto.scheduled_delivery_date
      ? new Date(dto.scheduled_delivery_date)
      : null;
    const order = await manager.save(
      Order,
      manager.create(Order, {
        checkout_id: checkoutId,
        client_id: user.id,
        unit_id: group.unitId,
        delivery_type: dto.delivery_type,
        delivery_status:
          dto.delivery_type === DeliveryType.DELIVERY
            ? DeliveryStatus.WAITING_DELIVERY_PERSON
            : null,
        address_id: address?.id ?? null,
        coupon_id: prepared?.coupon.id ?? null,
        scheduled_delivery_date: scheduledDate,
        is_scheduled: scheduledDate !== null,
        ...amounts,
      }),
    );

    let deliveryCode: string | null = null;
    if (order.delivery_type === DeliveryType.DELIVERY) {
      deliveryCode = this.deliveryCodeService.issue(order, 'DELIVERY');
      await manager.save(Order, order);
    }

    await manager.save(
      OrderItem,
      group.items.map((item) =>
        manager.create(OrderItem, {
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.product.price,
        }),
      ),
    );
    for (const item of group.items) {
      await manager.decrement(Stock, { product_id: item.product_id }, 'quantity', item.quantity);
    }
    await manager.save(
      Payment,
      manager.create(Payment, {
        order_id: order.id,
        method: dto.payment_method ?? null,
      }),
    );
    await manager.save(
      OrderStatusHistory,
      manager.create(OrderStatusHistory, {
        order_id: order.id,
        status: order.status,
        updated_by: user.id,
      }),
    );
    await this.couponRedemption.consume(
      prepared,
      order.id,
      { userId: user.id, unitId: group.unitId, subtotal: group.subtotal },
      manager,
    );
    return { order, deliveryCode };
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
        message: 'O carrinho está vazio.',
      });
    }
    const unavailable = items.filter(
      (item) => !item.product.active || !item.product.category?.active,
    );
    if (unavailable.length > 0) {
      throw new BadRequestException({
        code: 'PRODUCT_UNAVAILABLE',
        message: `Produtos indisponíveis: ${unavailable.map((item) => item.product.name).join(', ')}.`,
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
        message: `Estoque insuficiente: ${insufficient.map((item) => item.product.name).join(', ')}.`,
      });
    }
  }

  private async resolveAddress(
    manager: EntityManager,
    dto: CreateOrderDto,
    userId: number,
  ): Promise<Address | null> {
    if (dto.delivery_type !== DeliveryType.DELIVERY) return null;
    const address = await manager.findOne(Address, {
      where: { id: dto.address_id, user_id: userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  private async validateSchedule(dto: CreateOrderDto, groups: ICheckoutGroup[]): Promise<void> {
    if (!dto.scheduled_delivery_date) return;
    const date = new Date(dto.scheduled_delivery_date);
    if (date <= new Date()) {
      throw new BadRequestException('scheduled_delivery_date must be in the future');
    }
    await Promise.all(
      groups.map((group) => this.businessHours.assertWithinBusinessHours(group.unitId, date)),
    );
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
        message: 'Idempotency-Key deve ser um UUID v4 válido.',
      });
    }
  }
}
