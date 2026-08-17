import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { GlobalRole } from '../common/enums/global-role.enum';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { UpdateCouponDto } from './dtos/update-coupon.dto';
import { CreateCouponUseCase } from './use-cases/create-coupon.use-case';
import { ListCouponsUseCase } from './use-cases/list-coupons.use-case';
import { UpdateCouponUseCase } from './use-cases/update-coupon.use-case';
import { ValidateCouponUseCase } from './use-cases/validate-coupon.use-case';

@Controller('coupons')
export class CouponsController {
  constructor(
    private readonly createCouponUseCase: CreateCouponUseCase,
    private readonly updateCouponUseCase: UpdateCouponUseCase,
    private readonly listCouponsUseCase: ListCouponsUseCase,
    private readonly validateCouponUseCase: ValidateCouponUseCase,
  ) {}

  @Roles(GlobalRole.SUPER_ADMIN)
  @Get()
  list() {
    return this.listCouponsUseCase.execute();
  }

  @Get('validate/:code')
  validate(@Param('code') code: string) {
    return this.validateCouponUseCase.execute(code);
  }

  @Roles(GlobalRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.createCouponUseCase.execute(dto);
  }

  @Roles(GlobalRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.updateCouponUseCase.execute(id, dto);
  }
}
