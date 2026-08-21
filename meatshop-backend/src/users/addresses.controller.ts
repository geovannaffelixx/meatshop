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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Lista os endereços do usuário autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de endereços retornada com sucesso',
  })
  list(@CurrentUser() currentUser: User) {
    return this.listAddressesUseCase.execute(currentUser.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtém um endereço específico do usuário' })
  @ApiResponse({ status: 200, description: 'Endereço encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Endereço não encontrado' })
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.getAddressUseCase.execute(id, currentUser.id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um novo endereço para o usuário autenticado' })
  @ApiResponse({ status: 201, description: 'Endereço criado com sucesso' })
  create(@Body() dto: CreateAddressDto, @CurrentUser() currentUser: User) {
    return this.createAddressUseCase.execute(dto, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um endereço existente do usuário' })
  @ApiResponse({ status: 200, description: 'Endereço atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Endereço não encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateAddressUseCase.execute(id, dto, currentUser);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Define um endereço como padrão do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Endereço definido como padrão com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Endereço não encontrado' })
  setDefault(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.setDefaultAddressUseCase.execute(id, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um endereço do usuário' })
  @ApiResponse({ status: 200, description: 'Endereço removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Endereço não encontrado' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.deleteAddressUseCase.execute(id, currentUser);
  }
}
