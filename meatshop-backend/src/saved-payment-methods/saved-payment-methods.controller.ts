import {
  Body,
  GoneException,
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
    summary: 'Retired: enter cards in Mercado Pago Checkout Pro',
    deprecated: true,
  })
  @ApiResponse({ status: 410, description: 'Use hosted checkout' })
  @ApiResponse({ status: 400, description: 'Invalid or expired card token' })
  @Post()
  create(@Body() _dto: SavePaymentMethodDto, @CurrentUser() _currentUser: User) {
    throw new GoneException('Cards are now entered and managed in Mercado Pago Checkout Pro.');
  }

  @ApiOperation({ summary: 'Lists the authenticated user saved cards' })
  @ApiResponse({
    status: 200,
    description: 'Saved card list returned successfully',
  })
  @Get()
  list(@CurrentUser() currentUser: User) {
    return this.listSavedPaymentMethodsUseCase.execute(currentUser);
  }

  @ApiOperation({ summary: 'Retired: choose your card in hosted checkout', deprecated: true })
  @ApiResponse({ status: 410, description: 'Use hosted checkout' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  @Patch(':id/default')
  setDefault(@Param('id', ParseIntPipe) _id: number, @CurrentUser() _currentUser: User) {
    throw new GoneException('Select your card inside Mercado Pago Checkout Pro.');
  }

  @ApiOperation({ summary: 'Removes a saved card' })
  @ApiResponse({ status: 204, description: 'Card removed successfully' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.deletePaymentMethodUseCase.execute(id, currentUser);
  }
}
