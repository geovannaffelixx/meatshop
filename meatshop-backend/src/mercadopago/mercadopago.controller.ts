import {
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GlobalRole } from '../common/enums/global-role.enum';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../orders/entities/payment.entity';
import { OrderAuthorizationService } from '../orders/services/order-authorization.service';
import { User } from '../users/entities/user.entity';
import { MercadoPagoService } from '@/payments/providers/mercadopago.service';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller('mercadopago')
export class MercadoPagoController {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    private readonly mp: MercadoPagoService,
    private readonly orderAuthorizationService: OrderAuthorizationService,
  ) {}

  @ApiOperation({
    summary:
      'Cria uma preferência de pagamento no Mercado Pago e retorna a URL de checkout do pedido',
  })
  @ApiResponse({
    status: 201,
    description: 'Preferência de pagamento criada com sucesso',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para pagar este pedido',
  })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Post('orders/:id/checkout')
  async createCheckout(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    const order = await this.ordersRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.client_id !== currentUser.id && currentUser.global_role !== GlobalRole.SUPER_ADMIN) {
      await this.orderAuthorizationService.assertCanManageOrder(order, currentUser);
    }

    const pref = await this.mp.createPreference({
      orderId: order.id,
      amount: Number(order.total_amount),
      description: `Pedido #${order.id} - MeatShop`,
    });

    const payment = await this.getOrCreatePayment(order.id);
    payment.mp_preference_id = pref.preferenceId;
    payment.mp_last_event_at = new Date();
    await this.paymentsRepo.save(payment);

    return { ok: true, checkoutUrl: pref.checkoutUrl };
  }

  @ApiOperation({
    summary: 'Cria uma única preferência para todos os pedidos do checkout',
  })
  @Post('checkouts/:checkoutId/checkout')
  async createMultiUnitCheckout(
    @Param('checkoutId', new ParseUUIDPipe({ version: '4' }))
    checkoutId: string,
    @CurrentUser() currentUser: User,
  ) {
    const orders = await this.ordersRepo.find({
      where: { checkout_id: checkoutId },
      order: { unit_id: 'ASC' },
    });
    if (orders.length === 0) throw new NotFoundException('Checkout not found');
    if (
      currentUser.global_role !== GlobalRole.SUPER_ADMIN &&
      orders.some((order) => order.client_id !== currentUser.id)
    ) {
      throw new ForbiddenException('Checkout does not belong to current user');
    }

    const payments = await this.paymentsRepo
      .createQueryBuilder('payment')
      .addSelect('payment.mp_checkout_url')
      .where('payment.order_id IN (:...orderIds)', {
        orderIds: orders.map((order) => order.id),
      })
      .getMany();
    const reusable = payments.find(
      (payment) => payment.mp_preference_id && payment.mp_checkout_url,
    );
    if (reusable?.mp_checkout_url) {
      return {
        ok: true,
        checkoutId,
        checkoutUrl: reusable.mp_checkout_url,
        preferenceId: reusable.mp_preference_id,
      };
    }

    const preference = await this.mp.createCheckoutPreference({
      checkoutId,
      items: orders.map((order) => ({
        orderId: order.id,
        amount: Number(order.total_amount),
        description: `Pedido #${order.id} - MeatShop`,
      })),
    });
    const byOrder = new Map(payments.map((payment) => [payment.order_id, payment]));
    await this.paymentsRepo.save(
      orders.map((order) => {
        const payment = byOrder.get(order.id) ?? this.paymentsRepo.create({ order_id: order.id });
        payment.mp_preference_id = preference.preferenceId;
        payment.mp_checkout_url = preference.checkoutUrl;
        payment.mp_last_event_at = new Date();
        return payment;
      }),
    );
    return { ok: true, checkoutId, ...preference };
  }

  private async getOrCreatePayment(orderId: number): Promise<Payment> {
    const existing = await this.paymentsRepo.findOne({
      where: { order_id: orderId },
    });
    if (existing) {
      return existing;
    }
    return this.paymentsRepo.create({ order_id: orderId });
  }
}
