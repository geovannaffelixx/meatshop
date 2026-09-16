import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
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
import { UnitAddressService } from './services/unit-address.service';
import { UnitAuthorizationService } from './services/unit-authorization.service';
import { UnitPermission } from '../common/enums/unit-permission.enum';
import { FilterPublicUnitsDto } from './dtos/filter-public-units.dto';
import { GetPublicUnitUseCase } from './use-cases/get-public-unit.use-case';
import { ListPublicUnitsUseCase } from './use-cases/list-public-units.use-case';

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
    private readonly unitAddressService: UnitAddressService,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly listPublicUnitsUseCase: ListPublicUnitsUseCase,
    private readonly getPublicUnitUseCase: GetPublicUnitUseCase,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Lists all public marketplace units' })
  @Get()
  listPublic(@Query() filters: FilterPublicUnitsDto) {
    return this.listPublicUnitsUseCase.execute(filters);
  }

  @ApiOperation({ summary: 'Gets address and coordinates by unit postal code' })
  @Get(':unitId/address/cep/:cep')
  async lookupAddressByCep(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('cep') cep: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.unitAuthorizationService.resolveRequiredUnitId(
      currentUser,
      unitId,
      UnitPermission.MANAGE_UNIT,
    );
    return this.unitAddressService.lookupByCep(cep);
  }

  @ApiOperation({ summary: 'Lists units managed by the authenticated user' })
  @ApiResponse({ status: 200, description: 'Units returned successfully' })
  @Get('mine')
  listMine(@CurrentUser() currentUser: User) {
    return this.listManagedUnitsUseCase.execute(currentUser);
  }

  @ApiOperation({ summary: 'Gets administrative data for a unit' })
  @Get(':id/settings')
  getSettings(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.getUnitSettingsUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Creates a new unit' })
  @ApiResponse({ status: 201, description: 'Unit created successfully.' })
  @ApiResponse({
    status: 409,
    description: 'A unit with this CNPJ already exists.',
  })
  @Post()
  create(@Body() dto: CreateUnitDto, @CurrentUser() currentUser: User) {
    return this.createUnitUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Updates administrative data for an existing unit' })
  @ApiResponse({ status: 200, description: 'Unit updated successfully.' })
  @ApiResponse({
    status: 403,
    description: 'Current user is not an administrator of this unit.',
  })
  @ApiResponse({ status: 404, description: 'Unit not found.' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateUnitUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Adds a user as a unit member' })
  @ApiResponse({
    status: 201,
    description: 'User added to the unit successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Current user is not an administrator of this unit.',
  })
  @ApiResponse({
    status: 404,
    description: 'Unit or user not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already a member of this unit.',
  })
  @Post(':unitId/members')
  addMember(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() dto: CreateUserUnitDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.addUserToUnitUseCase.execute(unitId, dto, currentUser);
  }

  @ApiOperation({
    summary: 'Creates a user and grants administrative access to the unit',
  })
  @ApiResponse({
    status: 201,
    description: 'User created and linked to the unit.',
  })
  @ApiResponse({ status: 409, description: 'Email or CPF already registered.' })
  @Post(':unitId/members/create')
  createMember(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() dto: CreateUnitMemberDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.createUnitMemberUseCase.execute(unitId, dto, currentUser);
  }

  @ApiOperation({ summary: 'Lists administrative members of a unit' })
  @Get(':unitId/members')
  listMembers(@Param('unitId', ParseIntPipe) unitId: number, @CurrentUser() currentUser: User) {
    return this.listUnitMembersUseCase.execute(unitId, currentUser);
  }

  @ApiOperation({ summary: 'Changes the role or status of a unit member' })
  @Patch(':unitId/members/:membershipId')
  updateMember(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('membershipId', ParseIntPipe) membershipId: number,
    @Body() dto: UpdateUnitMemberDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateUnitMemberUseCase.execute(unitId, membershipId, dto, currentUser);
  }

  @ApiOperation({ summary: 'Removes a member access to the unit' })
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
  @ApiOperation({ summary: 'Lists unit business hours' })
  @ApiResponse({
    status: 200,
    description: 'Business hours returned successfully',
  })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @Get(':unitId/business-hours')
  listBusinessHours(@Param('unitId', ParseIntPipe) unitId: number) {
    return this.listBusinessHoursUseCase.execute(unitId);
  }

  @Public()
  @ApiOperation({ summary: 'Gets public unit details' })
  @Get(':id')
  getPublic(@Param('id', ParseIntPipe) id: number) {
    return this.getPublicUnitUseCase.execute(id);
  }

  @ApiOperation({
    summary:
      'Sets unit business hours. Provided days replace existing hours; omitted days remain unchanged',
  })
  @ApiResponse({
    status: 200,
    description: 'Business hours updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Opening time posterior ou igual ao de fechamento',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not an administrator of this unit',
  })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @Put(':unitId/business-hours')
  setBusinessHours(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() dto: SetBusinessHoursDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.setBusinessHoursUseCase.execute(unitId, dto, currentUser);
  }
}
