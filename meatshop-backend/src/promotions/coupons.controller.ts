import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { FilterCouponsDto } from './dtos/filter-coupons.dto';
import { UpdateCouponDto } from './dtos/update-coupon.dto';
import { ValidateCouponDto } from './dtos/validate-coupon.dto';
import { CreateCouponUseCase } from './use-cases/create-coupon.use-case';
import { GetCouponUseCase } from './use-cases/get-coupon.use-case';
import { ListCouponRedemptionsUseCase } from './use-cases/list-coupon-redemptions.use-case';
import { ListCouponsUseCase } from './use-cases/list-coupons.use-case';
import { UpdateCouponUseCase } from './use-cases/update-coupon.use-case';
import { ValidateCouponUseCase } from './use-cases/validate-coupon.use-case';

@ApiTags('Coupons')
@ApiBearerAuth('access-token')
@Controller('coupons')
export class CouponsController {
  constructor(
    private readonly createCoupon: CreateCouponUseCase,
    private readonly updateCoupon: UpdateCouponUseCase,
    private readonly listCoupons: ListCouponsUseCase,
    private readonly validateCoupon: ValidateCouponUseCase,
    private readonly getCoupon: GetCouponUseCase,
    private readonly listRedemptions: ListCouponRedemptionsUseCase,
  ) {}

  @Get() list(@Query() filters: FilterCouponsDto, @CurrentUser() user: User) {
    return this.listCoupons.execute(filters, user);
  }

  @Get('validate/:code') validate(
    @Param('code') code: string,
    @Query() query: ValidateCouponDto,
    @CurrentUser() user: User,
  ) {
    return this.validateCoupon.execute(code, user, query.unit_id, query.subtotal);
  }

  @Post() create(@Body() dto: CreateCouponDto, @CurrentUser() user: User) {
    return this.createCoupon.execute(dto, user);
  }

  @Get(':id') detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.getCoupon.execute(id, user);
  }

  @Get(':id/redemptions') redemptions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.listRedemptions.execute(id, user);
  }

  @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
    @CurrentUser() user: User,
  ) {
    return this.updateCoupon.execute(id, dto, user);
  }
}
