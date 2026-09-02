import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CheckoutQuoteResponseDto } from './dtos/checkout-quote-response.dto';
import { CreateOrderDto } from './dtos/create-order.dto';
import { QuoteCartUseCase } from './use-cases/quote-cart.use-case';

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@Controller('cart')
export class CheckoutController {
  constructor(private readonly quoteCartUseCase: QuoteCartUseCase) {}

  @ApiOperation({ summary: 'Calcula a prévia oficial do checkout por unidade' })
  @ApiResponse({ status: 201, type: CheckoutQuoteResponseDto })
  @Post('quote')
  quote(@Body() dto: CreateOrderDto, @CurrentUser() currentUser: User) {
    return this.quoteCartUseCase.execute(dto, currentUser);
  }
}
