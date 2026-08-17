import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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

  @Public()
  @Get()
  list(@Query() filters: FilterPromotionsDto) {
    return this.listPromotionsUseCase.execute(filters);
  }

  @Public()
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.getPromotionUseCase.execute(id);
  }

  @Post()
  create(@Body() dto: CreatePromotionDto, @CurrentUser() currentUser: User) {
    return this.createPromotionUseCase.execute(dto, currentUser);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromotionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updatePromotionUseCase.execute(id, dto, currentUser);
  }

  @Patch(':id/activate')
  activate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.activatePromotionUseCase.execute(id, currentUser);
  }

  @Patch(':id/deactivate')
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.deactivatePromotionUseCase.execute(id, currentUser);
  }
}
