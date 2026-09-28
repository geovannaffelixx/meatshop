import { ConfigService } from '@nestjs/config';
import { SellerAccountsService } from './seller-accounts.service';
import { Public } from '../common/decorators/public.decorator';
import { Body, Controller, Get, Query, Redirect, Param, ParseIntPipe, Post } from '@nestjs/common';
import { IsNumber, IsString, Min, MinLength, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaymentLifecycleService } from './payment-lifecycle.service';
export class PaymentReceiptDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount: number;
  @IsString() @MinLength(3) @MaxLength(200) reference: string;
}
export class PaymentRefundDto {
  @IsString() @MinLength(5) @MaxLength(255) reason: string;
}
@Controller('payments/orders')
export class PaymentsController {
  constructor(private readonly payments: PaymentLifecycleService) {}
  @Get() list(
    @Query('unit_id', ParseIntPipe) unitId: number,
    @Query('page') page: string,
    @CurrentUser() user: User,
  ) {
    return this.payments.list(unitId, user, Number(page ?? 0));
  }

  @Post(':id/receipt') receive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaymentReceiptDto,
    @CurrentUser() user: User,
  ) {
    return this.payments.receive(id, user, dto.amount, dto.reference);
  }

  @Post(':id/refund') refund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaymentRefundDto,
    @CurrentUser() user: User,
  ) {
    return this.payments.requestRefund(id, user, dto.reason);
  }

  @Post(':id/offline-refund') offlineRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaymentReceiptDto,
    @CurrentUser() user: User,
  ) {
    return this.payments.recordOfflineRefund(id, user, dto.amount, dto.reference);
  }

  @Post(':id/delivery-settlement') settlement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaymentReceiptDto,
    @CurrentUser() user: User,
  ) {
    return this.payments.settleDelivery(id, user, dto.amount, dto.reference);
  }

  @Post(':id/reconcile') reconcile(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.payments.reconcileOrder(id, user);
  }
}

@Controller('payments/sellers')
export class SellerPaymentsController {
  constructor(
    private readonly sellers: SellerAccountsService,
    private readonly config: ConfigService,
  ) {}

  @Get(':id/status') status(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.sellers.status(id, user);
  }

  @Post(':id/connect') connect(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.sellers.connect(id, user);
  }

  @Public()
  @Get('oauth/callback')
  @Redirect()
  async callback(@Query('code') code: string, @Query('state') state: string) {
    await this.sellers.callback(code, state);
    return {
      url: `${this.config.getOrThrow<string>('FRONTEND_URL').replace(/\/$/, '')}/finance`,
      statusCode: 303,
    };
  }
}
