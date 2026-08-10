import { Body, Controller, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateUnitDto } from './dtos/create-unit.dto';
import { CreateUserUnitDto } from './dtos/create-user-unit.dto';
import { UpdateUnitDto } from './dtos/update-unit.dto';
import { AddUserToUnitUseCase } from './use-cases/add-user-to-unit.use-case';
import { CreateUnitUseCase } from './use-cases/create-unit.use-case';
import { UpdateUnitUseCase } from './use-cases/update-unit.use-case';

@Controller('units')
export class UnitsController {
  constructor(
    private readonly createUnitUseCase: CreateUnitUseCase,
    private readonly updateUnitUseCase: UpdateUnitUseCase,
    private readonly addUserToUnitUseCase: AddUserToUnitUseCase,
  ) {}

  @Post()
  create(@Body() dto: CreateUnitDto, @CurrentUser() currentUser: User) {
    return this.createUnitUseCase.execute(dto, currentUser);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateUnitUseCase.execute(id, dto, currentUser);
  }

  @Post(':unitId/members')
  addMember(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() dto: CreateUserUnitDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.addUserToUnitUseCase.execute(unitId, dto, currentUser);
  }
}
