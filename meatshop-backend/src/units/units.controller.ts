import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { CreateUnitDto } from './dtos/create-unit.dto';
import { CreateUserUnitDto } from './dtos/create-user-unit.dto';
import { SetBusinessHoursDto } from './dtos/set-business-hours.dto';
import { UpdateUnitDto } from './dtos/update-unit.dto';
import { AddUserToUnitUseCase } from './use-cases/add-user-to-unit.use-case';
import { CreateUnitUseCase } from './use-cases/create-unit.use-case';
import { ListBusinessHoursUseCase } from './use-cases/list-business-hours.use-case';
import { SetBusinessHoursUseCase } from './use-cases/set-business-hours.use-case';
import { UpdateUnitUseCase } from './use-cases/update-unit.use-case';

@ApiTags('Units')
@ApiBearerAuth('access-token')
@Controller('units')
export class UnitsController {
  constructor(
    private readonly createUnitUseCase: CreateUnitUseCase,
    private readonly updateUnitUseCase: UpdateUnitUseCase,
    private readonly addUserToUnitUseCase: AddUserToUnitUseCase,
    private readonly listBusinessHoursUseCase: ListBusinessHoursUseCase,
    private readonly setBusinessHoursUseCase: SetBusinessHoursUseCase,
  ) {}

  @ApiOperation({ summary: 'Cria uma nova unidade' })
  @ApiResponse({ status: 201, description: 'Unidade criada com sucesso.' })
  @ApiResponse({
    status: 409,
    description: 'Ja existe uma unidade cadastrada com este CNPJ.',
  })
  @Post()
  create(@Body() dto: CreateUnitDto, @CurrentUser() currentUser: User) {
    return this.createUnitUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Atualiza os dados de uma unidade existente' })
  @ApiResponse({ status: 200, description: 'Unidade atualizada com sucesso.' })
  @ApiResponse({
    status: 403,
    description: 'Usuario atual nao e administrador desta unidade.',
  })
  @ApiResponse({ status: 404, description: 'Unidade nao encontrada.' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateUnitUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Adiciona um usuario como membro de uma unidade' })
  @ApiResponse({
    status: 201,
    description: 'Usuario adicionado a unidade com sucesso.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuario atual nao e administrador desta unidade.',
  })
  @ApiResponse({
    status: 404,
    description: 'Unidade ou usuario nao encontrado.',
  })
  @ApiResponse({
    status: 409,
    description: 'Usuario ja e membro desta unidade.',
  })
  @Post(':unitId/members')
  addMember(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() dto: CreateUserUnitDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.addUserToUnitUseCase.execute(unitId, dto, currentUser);
  }

  @Public()
  @ApiOperation({ summary: 'Lista o horário de funcionamento de uma unidade' })
  @ApiResponse({ status: 200, description: 'Horário de funcionamento retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  @Get(':unitId/business-hours')
  listBusinessHours(@Param('unitId', ParseIntPipe) unitId: number) {
    return this.listBusinessHoursUseCase.execute(unitId);
  }

  @ApiOperation({
    summary:
      'Define o horário de funcionamento de uma unidade. Dias informados substituem o horário existente; dias não informados permanecem inalterados',
  })
  @ApiResponse({ status: 200, description: 'Horário de funcionamento atualizado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Horário de abertura posterior ou igual ao de fechamento',
  })
  @ApiResponse({ status: 403, description: 'Usuário não é administrador desta unidade' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  @Put(':unitId/business-hours')
  setBusinessHours(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() dto: SetBusinessHoursDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.setBusinessHoursUseCase.execute(unitId, dto, currentUser);
  }
}
