import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CartAccessService } from '../../cart/services/cart-access.service';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { SendOrderStatusNotificationUseCase } from '../../notifications/use-cases/send-order-status-notification.use-case';
import { Address } from '../../users/entities/address.entity';
import { Coupon } from '../../promotions/entities/coupon.entity';
import { CouponRedemptionService } from '../../promotions/services/coupon-redemption.service';
import { Stock } from '../../products/entities/stock.entity';
import { User } from '../../users/entities/user.entity';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { DeliveryStatus } from '../enums/delivery-status.enum';
import { DeliveryType } from '../enums/delivery-type.enum';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderStatusHistory } from '../entities/order-status-history.entity';
import { Payment } from '../entities/payment.entity';
import { StockAvailabilityValidator } from '../validators/stock-availability.validator';

interface IOrderAmounts {
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total_amount: number;
}

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
    @InjectRepository(OrderStatusHistory)
    private readonly historyRepository: Repository<OrderStatusHistory>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly cartAccessService: CartAccessService,
    private readonly stockAvailabilityValidator: StockAvailabilityValidator,
    private readonly couponRedemption: CouponRedemptionService,
    private readonly configService: ConfigService,
    private readonly sendOrderStatusNotificationUseCase: SendOrderStatusNotificationUseCase,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute(dto: CreateOrderDto, currentUser: User): Promise<Order> {
    const items = await this.loadCartItems(currentUser.id);
    const unitId = this.assertSameUnit(items);
    this.assertProductsActive(items);
    await this.stockAvailabilityValidator.assertAvailable(
      items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product.name,
        quantity: item.quantity,
      })),
    );

    const address = await this.resolveAddress(dto, currentUser);
    const subtotal = this.calculateSubtotal(items);

    const order = await this.dataSource.transaction(async (manager) => {
      const prepared = await this.couponRedemption.prepare(
        dto.coupon_code,
        {
          userId: currentUser.id,
          unitId,
          subtotal,
        },
        manager,
      );
      const amounts = this.calculateAmounts(
        subtotal,
        prepared?.discountAmount ?? 0,
        dto.delivery_type,
      );
      const order = await this.persistOrder(
        manager,
        dto,
        currentUser,
        unitId,
        address,
        prepared?.coupon ?? null,
        amounts,
      );
      await this.persistOrderItems(manager, order.id, items);
      await this.decrementStock(manager, items);
      await manager.save(Payment, manager.create(Payment, { order_id: order.id }));
      await manager.save(
        OrderStatusHistory,
        manager.create(OrderStatusHistory, {
          order_id: order.id,
          status: order.status,
          updated_by: currentUser.id,
        }),
      );
      await manager.delete(CartItem, { cart_id: items[0].cart_id });
      await this.couponRedemption.consume(
        prepared,
        order.id,
        { userId: currentUser.id, unitId, subtotal },
        manager,
      );
      return order;
    });

    await this.sendOrderStatusNotificationUseCase
      .notifyUnitOfNewOrder(order)
      .catch((error) =>
        this.logger.warn(`Failed to notify unit of new order ${order.id}: ${error.message}`),
      );

    return order;
  }

  private async loadCartItems(userId: number): Promise<CartItem[]> {
    const cart = await this.cartAccessService.getOrCreateCart(userId);
    const items = await this.cartItemRepository.find({
      where: { cart_id: cart.id },
      relations: ['product'],
    });

    if (items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    return items;
  }

  private assertSameUnit(items: CartItem[]): number {
    const unitIds = new Set(items.map((item) => item.product.unit_id));
    if (unitIds.size > 1) {
      throw new BadRequestException('All cart items must belong to the same unit');
    }
    return unitIds.values().next().value as number;
  }

  private assertProductsActive(items: CartItem[]): void {
    const inactive = items.filter((item) => !item.product.active);
    if (inactive.length > 0) {
      throw new BadRequestException(
        `Unavailable products: ${inactive.map((i) => i.product.name).join(', ')}`,
      );
    }
  }

  private async resolveAddress(dto: CreateOrderDto, currentUser: User): Promise<Address | null> {
    if (dto.delivery_type !== DeliveryType.DELIVERY) {
      return null;
    }

    const address = await this.addressRepository.findOne({
      where: { id: dto.address_id, user_id: currentUser.id },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  private calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  }

  private calculateAmounts(
    subtotal: number,
    discount_amount: number,
    deliveryType: DeliveryType,
  ): IOrderAmounts {
    const deliveryFee =
      deliveryType === DeliveryType.DELIVERY
        ? Number(this.configService.get<string>('DEFAULT_DELIVERY_FEE', '0'))
        : 0;
    const totalAmount = Math.max(0, subtotal - discount_amount + deliveryFee);

    return { subtotal, discount_amount, delivery_fee: deliveryFee, total_amount: totalAmount };
  }

  private async persistOrder(
    manager: EntityManager,
    dto: CreateOrderDto,
    currentUser: User,
    unitId: number,
    address: Address | null,
    coupon: Coupon | null,
    amounts: IOrderAmounts,
  ): Promise<Order> {
    const order = manager.create(Order, {
      client_id: currentUser.id,
      unit_id: unitId,
      delivery_type: dto.delivery_type,
      delivery_status:
        dto.delivery_type === DeliveryType.DELIVERY ? DeliveryStatus.WAITING_DELIVERY_PERSON : null,
      address_id: address?.id ?? null,
      coupon_id: coupon?.id ?? null,
      ...amounts,
    });
    return manager.save(Order, order);
  }

  private async persistOrderItems(
    manager: EntityManager,
    orderId: number,
    items: CartItem[],
  ): Promise<void> {
    const orderItems = items.map((item) =>
      manager.create(OrderItem, {
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.product.price,
      }),
    );
    await manager.save(OrderItem, orderItems);
  }

  private async decrementStock(manager: EntityManager, items: CartItem[]): Promise<void> {
    for (const item of items) {
      await manager.decrement(Stock, { product_id: item.product_id }, 'quantity', item.quantity);
    }
  }
}
