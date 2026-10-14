import { ConfigService } from '@nestjs/config';
import { SellerAccountsService } from './seller-accounts.service';
import { Public } from '../common/decorators/public.decorator';
import {
  Body,
  Controller,
  Get,
  Query,
  Redirect,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  IsNumber,
  IsString,
  Min,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  Matches,
} from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaymentLifecycleService } from './payment-lifecycle.service';
import { Transform } from 'class-transformer';
export class PaymentReceiptDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount: number;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reference: string;
}
export class PaymentRefundDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  reason: string;
}
export class PaymentListQueryDto {
  @IsOptional() @IsString() unit_id?: string;
  @IsOptional() @Matches(/^\d{1,5}$/) page?: string;
  @IsOptional() @IsIn(['all', 'pending', 'refunds', 'issues', 'receivable']) view?: string;
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month?: string;
}
@Controller('payments/orders')
export class PaymentsController {
  constructor(private readonly payments: PaymentLifecycleService) {}
  @Get(':id/history') history(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.payments.history(id, user);
  }

  @Post(':id/refunds/:refundId/retry') retry(
    @Param('id', ParseIntPipe) id: number,
    @Param('refundId', new ParseUUIDPipe({ version: '4' })) refundId: string,
    @CurrentUser() user: User,
  ) {
    return this.payments.retryRefund(id, refundId, user);
  }

  @Get() list(
    @Query('unit_id', ParseIntPipe) unitId: number,
    @Query() query: PaymentListQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.payments.list(unitId, user, Number(query.page ?? 0), query.view, query.month);
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

  @Post(':id/pause') pause(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.sellers.pause(id, user);
  }

  @Public()
  @Get('oauth/callback')
  @Redirect()
  async callback(@Query('code') code: string, @Query('state') state: string) {
    const base = `${this.config.getOrThrow<string>('FRONTEND_URL').replace(/\/$/, '')}/finance`;
    try {
      const account = await this.sellers.callback(code, state);
      return { url: `${base}?mp_connection=success&unit_id=${account.unit_id}`, statusCode: 303 };
    } catch (error) {
      return {
        url: `${base}?mp_connection=${error instanceof ServiceUnavailableException ? 'unavailable' : 'failed'}`,
        statusCode: 303,
      };
    }
  }
}
