import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { CreateUnitDto } from './dtos/create-unit.dto';
import { CreateUnitMemberDto } from './dtos/create-unit-member.dto';
import { CreateUserUnitDto } from './dtos/create-user-unit.dto';
import { SetBusinessHoursDto } from './dtos/set-business-hours.dto';
import { UpdateUnitDto } from './dtos/update-unit.dto';
import { UpdateUnitMemberDto } from './dtos/update-unit-member.dto';
import { AddUserToUnitUseCase } from './use-cases/add-user-to-unit.use-case';
import { CreateUnitUseCase } from './use-cases/create-unit.use-case';
import { ListBusinessHoursUseCase } from './use-cases/list-business-hours.use-case';
import { ListManagedUnitsUseCase } from './use-cases/list-managed-units.use-case';
import { SetBusinessHoursUseCase } from './use-cases/set-business-hours.use-case';
import { UpdateUnitUseCase } from './use-cases/update-unit.use-case';
import { ListUnitMembersUseCase } from './use-cases/list-unit-members.use-case';
import { UpdateUnitMemberUseCase } from './use-cases/update-unit-member.use-case';
import { RemoveUnitMemberUseCase } from './use-cases/remove-unit-member.use-case';
import { CreateUnitMemberUseCase } from './use-cases/create-unit-member.use-case';
import { GetUnitSettingsUseCase } from './use-cases/get-unit-settings.use-case';

@ApiTags('Units')
@ApiBearerAuth('access-token')
@Controller('units')
export class UnitsController {
  constructor(
    private readonly createUnitUseCase: CreateUnitUseCase,
    private readonly updateUnitUseCase: UpdateUnitUseCase,
    private readonly addUserToUnitUseCase: AddUserToUnitUseCase,
    private readonly listBusinessHoursUseCase: ListBusinessHoursUseCase,
    private readonly listManagedUnitsUseCase: ListManagedUnitsUseCase,
    private readonly setBusinessHoursUseCase: SetBusinessHoursUseCase,
    private readonly listUnitMembersUseCase: ListUnitMembersUseCase,
    private readonly updateUnitMemberUseCase: UpdateUnitMemberUseCase,
    private readonly removeUnitMemberUseCase: RemoveUnitMemberUseCase,
    private readonly createUnitMemberUseCase: CreateUnitMemberUseCase,
    private readonly getUnitSettingsUseCase: GetUnitSettingsUseCase,
  ) {}

  @ApiOperation({ summary: 'Lista as unidades administradas ou geridas pelo usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Unidades retornadas com sucesso' })
  @Get('mine')
  listMine(@CurrentUser() currentUser: User) {
    return this.listManagedUnitsUseCase.execute(currentUser);
  }

  @ApiOperation({ summary: 'Consulta os dados administrativos de uma unidade' })
  @Get(':id/settings')
  getSettings(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.getUnitSettingsUseCase.execute(id, currentUser);
  }

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

  @ApiOperation({ summary: 'Cria um usuário e concede acesso administrativo à unidade' })
  @ApiResponse({ status: 201, description: 'Usuário criado e vinculado à unidade.' })
  @ApiResponse({ status: 409, description: 'E-mail ou CPF já cadastrado.' })
  @Post(':unitId/members/create')
  createMember(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() dto: CreateUnitMemberDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.createUnitMemberUseCase.execute(unitId, dto, currentUser);
  }

  @ApiOperation({ summary: 'Lista os membros administrativos de uma unidade' })
  @Get(':unitId/members')
  listMembers(
    @Param('unitId', ParseIntPipe) unitId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.listUnitMembersUseCase.execute(unitId, currentUser);
  }

  @ApiOperation({ summary: 'Altera o papel ou status de um membro da unidade' })
  @Patch(':unitId/members/:membershipId')
  updateMember(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('membershipId', ParseIntPipe) membershipId: number,
    @Body() dto: UpdateUnitMemberDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateUnitMemberUseCase.execute(unitId, membershipId, dto, currentUser);
  }

  @ApiOperation({ summary: 'Remove o acesso de um membro à unidade' })
  @Delete(':unitId/members/:membershipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('membershipId', ParseIntPipe) membershipId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.removeUnitMemberUseCase.execute(unitId, membershipId, currentUser);
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
