import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { GlobalRole } from '../common/enums/global-role.enum';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { UpdateCouponDto } from './dtos/update-coupon.dto';
import { CreateCouponUseCase } from './use-cases/create-coupon.use-case';
import { ListCouponsUseCase } from './use-cases/list-coupons.use-case';
import { UpdateCouponUseCase } from './use-cases/update-coupon.use-case';
import { ValidateCouponUseCase } from './use-cases/validate-coupon.use-case';

@ApiTags('Coupons')
@ApiBearerAuth('access-token')
@Controller('coupons')
export class CouponsController {
  constructor(
    private readonly createCouponUseCase: CreateCouponUseCase,
    private readonly updateCouponUseCase: UpdateCouponUseCase,
    private readonly listCouponsUseCase: ListCouponsUseCase,
    private readonly validateCouponUseCase: ValidateCouponUseCase,
  ) {}

  @ApiOperation({ summary: 'Lista todos os cupons cadastrados (restrito a SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Lista de cupons retornada com sucesso' })
  @ApiResponse({ status: 403, description: 'Sem permissão para listar cupons' })
  @Roles(GlobalRole.SUPER_ADMIN)
  @Get()
  list() {
    return this.listCouponsUseCase.execute();
  }

  @ApiOperation({ summary: 'Valida um cupom pelo código, verificando se está ativo e não expirado' })
  @ApiParam({ name: 'code', description: 'Código do cupom a ser validado', example: 'PROMO10' })
  @ApiResponse({ status: 200, description: 'Cupom válido' })
  @ApiResponse({ status: 400, description: 'Cupom inválido ou expirado' })
  @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
  @Get('validate/:code')
  validate(@Param('code') code: string) {
    return this.validateCouponUseCase.execute(code);
  }

  @ApiOperation({ summary: 'Cria um novo cupom de desconto (restrito a SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Cupom criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Sem permissão para criar cupons' })
  @ApiResponse({ status: 409, description: 'Código de cupom já cadastrado' })
  @Roles(GlobalRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.createCouponUseCase.execute(dto);
  }

  @ApiOperation({ summary: 'Atualiza um cupom existente (restrito a SUPER_ADMIN)' })
  @ApiParam({ name: 'id', description: 'Identificador do cupom', example: 1 })
  @ApiResponse({ status: 200, description: 'Cupom atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Sem permissão para atualizar cupons' })
  @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
  @Roles(GlobalRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.updateCouponUseCase.execute(id, dto);
  }
}
