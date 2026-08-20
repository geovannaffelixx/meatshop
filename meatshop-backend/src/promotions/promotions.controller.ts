import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { CreatePromotionDto } from './dtos/create-promotion.dto';
import { FilterPromotionsDto } from './dtos/filter-promotions.dto';
import { UpdatePromotionDto } from './dtos/update-promotion.dto';
import { ActivatePromotionUseCase } from './use-cases/activate-promotion.use-case';
import { CreatePromotionUseCase } from './use-cases/create-promotion.use-case';
import { DeactivatePromotionUseCase } from './use-cases/deactivate-promotion.use-case';
import { GetPromotionUseCase } from './use-cases/get-promotion.use-case';
import { ListPromotionsUseCase } from './use-cases/list-promotions.use-case';
import { UpdatePromotionUseCase } from './use-cases/update-promotion.use-case';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly createPromotionUseCase: CreatePromotionUseCase,
    private readonly updatePromotionUseCase: UpdatePromotionUseCase,
    private readonly activatePromotionUseCase: ActivatePromotionUseCase,
    private readonly deactivatePromotionUseCase: DeactivatePromotionUseCase,
    private readonly listPromotionsUseCase: ListPromotionsUseCase,
    private readonly getPromotionUseCase: GetPromotionUseCase,
  ) {}

  @ApiOperation({
    summary: 'Lista promoções, opcionalmente filtradas por unidade, produto ou status',
  })
  @ApiResponse({ status: 200, description: 'Lista de promoções retornada com sucesso' })
  @Public()
  @Get()
  list(@Query() filters: FilterPromotionsDto) {
    return this.listPromotionsUseCase.execute(filters);
  }

  @ApiOperation({ summary: 'Obtém os detalhes de uma promoção pelo identificador' })
  @ApiParam({ name: 'id', description: 'Identificador da promoção', example: 1 })
  @ApiResponse({ status: 200, description: 'Promoção retornada com sucesso' })
  @ApiResponse({ status: 404, description: 'Promoção não encontrada' })
  @Public()
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.getPromotionUseCase.execute(id);
  }

  @ApiOperation({ summary: 'Cria uma nova promoção' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 201, description: 'Promoção criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Sem permissão para criar promoções' })
  @Post()
  create(@Body() dto: CreatePromotionDto, @CurrentUser() currentUser: User) {
    return this.createPromotionUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Atualiza uma promoção existente' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'Identificador da promoção', example: 1 })
  @ApiResponse({ status: 200, description: 'Promoção atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Sem permissão para atualizar promoções' })
  @ApiResponse({ status: 404, description: 'Promoção não encontrada' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromotionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updatePromotionUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Ativa uma promoção' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'Identificador da promoção', example: 1 })
  @ApiResponse({ status: 200, description: 'Promoção ativada com sucesso' })
  @ApiResponse({ status: 403, description: 'Sem permissão para ativar promoções' })
  @ApiResponse({ status: 404, description: 'Promoção não encontrada' })
  @Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.activatePromotionUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Desativa uma promoção' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'Identificador da promoção', example: 1 })
  @ApiResponse({ status: 200, description: 'Promoção desativada com sucesso' })
  @ApiResponse({ status: 403, description: 'Sem permissão para desativar promoções' })
  @ApiResponse({ status: 404, description: 'Promoção não encontrada' })
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.deactivatePromotionUseCase.execute(id, currentUser);
  }
}
