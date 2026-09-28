import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { PaymentLifecycleService } from '../payments/payment-lifecycle.service';
import { SellerAccountsService } from '../payments/seller-accounts.service';

@Controller('mercadopago')
export class MercadoPagoController {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly lifecycle: PaymentLifecycleService,
    private readonly mp: SellerAccountsService,
  ) {}

  @Public()
  @Get('capabilities')
  capabilities() {
    return {
      online: this.mp.enabled,
      methods: this.mp.enabled
        ? ['Pix', 'Credit', 'Debit', 'Cash', 'Card on Delivery']
        : ['Cash', 'Card on Delivery'],
      card_entry: 'HOSTED_CHECKOUT',
    };
  }

  @Post('orders/:id/checkout')
  async checkout(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    const order = await this.orders.findOneBy({ id, client_id: user.id });
    if (!order) throw new NotFoundException('Order not found');
    return this.lifecycle.checkout(String(id), user);
  }

  @Post('checkouts/:id/checkout')
  checkoutGroup(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: User,
  ) {
    return this.lifecycle.checkout(id, user);
  }
}
