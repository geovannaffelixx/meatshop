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
import { CreateOrderDto } from '../dtos/create-order.dto';
import { DeliveryType } from '../enums/delivery-type.enum';
import { CheckoutPricingService } from '../services/checkout-pricing.service';
import { BusinessHoursValidator } from '../validators/business-hours.validator';
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
    private readonly businessHours: BusinessHoursValidator,
    private readonly dataSource: DataSource,
  ) {}

  async execute(dto: CreateOrderDto, user: User): Promise<CheckoutQuoteResponseDto> {
    const cart = await this.cartAccess.getOrCreateCart(user.id);
    const items = await this.cartItems.find({
      where: { cart_id: cart.id },
      relations: ['product', 'product.category'],
      order: { product_id: 'ASC' },
    });
    if (items.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_CART',
        message: 'O carrinho está vazio.',
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
    if (dto.scheduled_delivery_date) {
      const date = new Date(dto.scheduled_delivery_date);
      if (date <= new Date()) throw new BadRequestException('Schedule must be in the future');
      await Promise.all(
        groups.map((group) => this.businessHours.assertWithinBusinessHours(group.unitId, date)),
      );
    }

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
      }
      return result;
    });
    return {
      groups: quoted,
      total_amount: Number(quoted.reduce((sum, group) => sum + group.total_amount, 0).toFixed(2)),
    };
  }
}
