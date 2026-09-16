import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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

@ApiTags('Addresses')
@ApiBearerAuth('access-token')
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
  @ApiOperation({ summary: 'Lists the authenticated user addresses' })
  @ApiResponse({
    status: 200,
    description: 'Address list returned successfully',
  })
  list(@CurrentUser() currentUser: User) {
    return this.listAddressesUseCase.execute(currentUser.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Gets a specific user address' })
  @ApiResponse({ status: 200, description: 'Address found successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.getAddressUseCase.execute(id, currentUser.id);
  }

  @Post()
  @ApiOperation({ summary: 'Creates a new address for the authenticated user' })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  create(@Body() dto: CreateAddressDto, @CurrentUser() currentUser: User) {
    return this.createAddressUseCase.execute(dto, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Updates an existing user address' })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateAddressUseCase.execute(id, dto, currentUser);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Sets an address as the user default' })
  @ApiResponse({
    status: 200,
    description: 'Address set as default successfully',
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  setDefault(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.setDefaultAddressUseCase.execute(id, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Removes a user address' })
  @ApiResponse({ status: 200, description: 'Address removed successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.deleteAddressUseCase.execute(id, currentUser);
  }
}
