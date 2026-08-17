import { Controller, NotFoundException, Param, ParseIntPipe, Post } from '@nestjs/common';
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
    @InjectRepository(Payment) private readonly paymentsRepo: Repository<Payment>,
    private readonly mp: MercadoPagoService,
    private readonly orderAuthorizationService: OrderAuthorizationService,
  ) {}

  @ApiOperation({
    summary:
      'Cria uma preferência de pagamento no Mercado Pago e retorna a URL de checkout do pedido',
  })
  @ApiResponse({ status: 201, description: 'Preferência de pagamento criada com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para pagar este pedido' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Post('orders/:id/checkout')
  async createCheckout(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    const order = await this.ordersRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.client_id !== currentUser.id &&
      currentUser.global_role !== GlobalRole.SUPER_ADMIN
    ) {
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

  private async getOrCreatePayment(orderId: number): Promise<Payment> {
    const existing = await this.paymentsRepo.findOne({ where: { order_id: orderId } });
    if (existing) {
      return existing;
    }
    return this.paymentsRepo.create({ order_id: orderId });
  }
}
