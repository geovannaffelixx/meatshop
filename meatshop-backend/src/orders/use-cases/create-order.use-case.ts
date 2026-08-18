import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartAccessService } from '../../cart/services/cart-access.service';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { SendOrderStatusNotificationUseCase } from '../../notifications/use-cases/send-order-status-notification.use-case';
import { Address } from '../../users/entities/address.entity';
import { Coupon } from '../../promotions/entities/coupon.entity';
import { ValidateCouponUseCase } from '../../promotions/use-cases/validate-coupon.use-case';
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

interface OrderAmounts {
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
    private readonly validateCouponUseCase: ValidateCouponUseCase,
    private readonly configService: ConfigService,
    private readonly sendOrderStatusNotificationUseCase: SendOrderStatusNotificationUseCase,
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
    const coupon = await this.resolveCoupon(dto.coupon_code);
    const amounts = this.calculateAmounts(items, coupon, dto.delivery_type);

    const order = await this.persistOrder(dto, currentUser, unitId, address, coupon, amounts);
    await this.persistOrderItems(order.id, items);
    await this.decrementStock(items);
    await this.paymentRepository.save(this.paymentRepository.create({ order_id: order.id }));
    await this.historyRepository.save(
      this.historyRepository.create({
        order_id: order.id,
        status: order.status,
        updated_by: currentUser.id,
      }),
    );
    await this.cartItemRepository.delete({ cart_id: items[0].cart_id });

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

  private async resolveCoupon(code: string | undefined): Promise<Coupon | null> {
    if (!code) {
      return null;
    }
    return this.validateCouponUseCase.execute(code);
  }

  private calculateAmounts(
    items: CartItem[],
    coupon: Coupon | null,
    deliveryType: DeliveryType,
  ): OrderAmounts {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );
    const discount_amount = this.calculateDiscount(subtotal, coupon);
    const delivery_fee =
      deliveryType === DeliveryType.DELIVERY
        ? Number(this.configService.get<string>('DEFAULT_DELIVERY_FEE', '0'))
        : 0;
    const total_amount = Math.max(0, subtotal - discount_amount + delivery_fee);

    return { subtotal, discount_amount, delivery_fee, total_amount };
  }

  private calculateDiscount(subtotal: number, coupon: Coupon | null): number {
    if (!coupon) return 0;
    if (coupon.discount_percentage) {
      return subtotal * (Number(coupon.discount_percentage) / 100);
    }
    if (coupon.discount_value) {
      return Math.min(Number(coupon.discount_value), subtotal);
    }
    return 0;
  }

  private async persistOrder(
    dto: CreateOrderDto,
    currentUser: User,
    unitId: number,
    address: Address | null,
    coupon: Coupon | null,
    amounts: OrderAmounts,
  ): Promise<Order> {
    const order = this.orderRepository.create({
      client_id: currentUser.id,
      unit_id: unitId,
      delivery_type: dto.delivery_type,
      delivery_status:
        dto.delivery_type === DeliveryType.DELIVERY ? DeliveryStatus.WAITING_DELIVERY_PERSON : null,
      address_id: address?.id ?? null,
      coupon_id: coupon?.id ?? null,
      ...amounts,
    });
    return this.orderRepository.save(order);
  }

  private async persistOrderItems(orderId: number, items: CartItem[]): Promise<void> {
    const orderItems = items.map((item) =>
      this.orderItemRepository.create({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.product.price,
      }),
    );
    await this.orderItemRepository.save(orderItems);
  }

  private async decrementStock(items: CartItem[]): Promise<void> {
    for (const item of items) {
      await this.stockRepository.decrement(
        { product_id: item.product_id },
        'quantity',
        item.quantity,
      );
    }
  }
}
