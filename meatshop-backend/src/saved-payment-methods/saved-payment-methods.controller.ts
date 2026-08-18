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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SavePaymentMethodDto } from './dtos/save-payment-method.dto';
import { DeletePaymentMethodUseCase } from './use-cases/delete-payment-method.use-case';
import { ListSavedPaymentMethodsUseCase } from './use-cases/list-saved-payment-methods.use-case';
import { SavePaymentMethodUseCase } from './use-cases/save-payment-method.use-case';
import { SetDefaultPaymentMethodUseCase } from './use-cases/set-default-payment-method.use-case';

@ApiTags('SavedPaymentMethods')
@ApiBearerAuth('access-token')
@Controller('saved-payment-methods')
export class SavedPaymentMethodsController {
  constructor(
    private readonly savePaymentMethodUseCase: SavePaymentMethodUseCase,
    private readonly listSavedPaymentMethodsUseCase: ListSavedPaymentMethodsUseCase,
    private readonly setDefaultPaymentMethodUseCase: SetDefaultPaymentMethodUseCase,
    private readonly deletePaymentMethodUseCase: DeletePaymentMethodUseCase,
  ) {}

  @ApiOperation({
    summary: 'Salva um novo cartão a partir de um token gerado pelo SDK do Mercado Pago no cliente',
  })
  @ApiResponse({ status: 201, description: 'Cartão salvo com sucesso' })
  @ApiResponse({ status: 400, description: 'Token de cartão inválido ou expirado' })
  @Post()
  create(@Body() dto: SavePaymentMethodDto, @CurrentUser() currentUser: User) {
    return this.savePaymentMethodUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Lista os cartões salvos do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de cartões retornada com sucesso' })
  @Get()
  list(@CurrentUser() currentUser: User) {
    return this.listSavedPaymentMethodsUseCase.execute(currentUser);
  }

  @ApiOperation({ summary: 'Define um cartão salvo como padrão do usuário' })
  @ApiResponse({ status: 200, description: 'Cartão definido como padrão com sucesso' })
  @ApiResponse({ status: 404, description: 'Cartão não encontrado' })
  @Patch(':id/default')
  setDefault(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.setDefaultPaymentMethodUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Remove um cartão salvo' })
  @ApiResponse({ status: 204, description: 'Cartão removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Cartão não encontrado' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.deletePaymentMethodUseCase.execute(id, currentUser);
  }
}
