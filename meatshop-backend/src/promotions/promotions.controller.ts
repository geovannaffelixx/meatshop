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
    summary: 'Lists promotions with optional unit, product, or status filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Promotion list returned successfully',
  })
  @Public()
  @Get()
  list(@Query() filters: FilterPromotionsDto) {
    return this.listPromotionsUseCase.execute(filters);
  }

  @ApiOperation({ summary: 'Gets promotion details by identifier' })
  @ApiParam({ name: 'id', description: 'Promotion identifier', example: 1 })
  @ApiResponse({ status: 200, description: 'Promotion returned successfully' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @Public()
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.getPromotionUseCase.execute(id);
  }

  @ApiOperation({ summary: 'Creates a new promotion' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 201, description: 'Promotion created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({
    status: 403,
    description: 'Permission denied to create promotions',
  })
  @Post()
  create(@Body() dto: CreatePromotionDto, @CurrentUser() currentUser: User) {
    return this.createPromotionUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Updates an existing promotion' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'Promotion identifier', example: 1 })
  @ApiResponse({ status: 200, description: 'Promotion updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({
    status: 403,
    description: 'Permission denied to update promotions',
  })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromotionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updatePromotionUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Activates a promotion' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'Promotion identifier', example: 1 })
  @ApiResponse({ status: 200, description: 'Promotion activated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Permission denied to activate promotions',
  })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.activatePromotionUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Deactivates a promotion' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'Promotion identifier', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Promotion deactivated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Permission denied to deactivate promotions',
  })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.deactivatePromotionUseCase.execute(id, currentUser);
  }
}
