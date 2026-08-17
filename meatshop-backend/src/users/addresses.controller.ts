import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateAddressDto } from './dtos/create-address.dto';
import { UpdateAddressDto } from './dtos/update-address.dto';
import { User } from './entities/user.entity';
import { CreateAddressUseCase } from './use-cases/create-address.use-case';
import { DeleteAddressUseCase } from './use-cases/delete-address.use-case';
import { GetAddressUseCase } from './use-cases/get-address.use-case';
import { ListAddressesUseCase } from './use-cases/list-addresses.use-case';
import { SetDefaultAddressUseCase } from './use-cases/set-default-address.use-case';
import { UpdateAddressUseCase } from './use-cases/update-address.use-case';

@Controller('addresses')
export class AddressesController {
  constructor(
    private readonly createAddressUseCase: CreateAddressUseCase,
    private readonly updateAddressUseCase: UpdateAddressUseCase,
    private readonly setDefaultAddressUseCase: SetDefaultAddressUseCase,
    private readonly listAddressesUseCase: ListAddressesUseCase,
    private readonly getAddressUseCase: GetAddressUseCase,
    private readonly deleteAddressUseCase: DeleteAddressUseCase,
  ) {}

  @Get()
  list(@CurrentUser() currentUser: User) {
    return this.listAddressesUseCase.execute(currentUser.id);
  }

  @Get(':id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.getAddressUseCase.execute(id, currentUser.id);
  }

  @Post()
  create(@Body() dto: CreateAddressDto, @CurrentUser() currentUser: User) {
    return this.createAddressUseCase.execute(dto, currentUser);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateAddressUseCase.execute(id, dto, currentUser);
  }

  @Patch(':id/default')
  setDefault(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.setDefaultAddressUseCase.execute(id, currentUser);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.deleteAddressUseCase.execute(id, currentUser);
  }
}
