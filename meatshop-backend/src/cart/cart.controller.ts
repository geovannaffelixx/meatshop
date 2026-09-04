import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AddCartItemDto } from './dtos/add-cart-item.dto';
import { CartResponseDto } from './dtos/cart-response.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';
import { AddItemToCartUseCase } from './use-cases/add-item-to-cart.use-case';
import { ClearCartUseCase } from './use-cases/clear-cart.use-case';
import { GetCartUseCase } from './use-cases/get-cart.use-case';
import { RemoveCartItemUseCase } from './use-cases/remove-cart-item.use-case';
import { UpdateCartItemUseCase } from './use-cases/update-cart-item.use-case';

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@Controller('cart')
export class CartController {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly addItemToCartUseCase: AddItemToCartUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  @ApiOperation({ summary: 'Obtém o carrinho do usuário autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Carrinho retornado com sucesso',
    type: CartResponseDto,
  })
  @Get()
  getCart(@CurrentUser() currentUser: User) {
    return this.getCartUseCase.execute(currentUser);
  }

  @ApiOperation({ summary: 'Adiciona um item ao carrinho do usuário autenticado' })
  @ApiResponse({
    status: 201,
    description: 'Item adicionado ao carrinho com sucesso',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @Post('items')
  addItem(@Body() dto: AddCartItemDto, @CurrentUser() currentUser: User) {
    return this.addItemToCartUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Atualiza a quantidade de um item do carrinho' })
  @ApiParam({ name: 'itemId', description: 'Identificador do item do carrinho', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Item do carrinho atualizado com sucesso',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Item do carrinho não encontrado' })
  @Patch('items/:itemId')
  updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateCartItemUseCase.execute(itemId, dto, currentUser);
  }

  @ApiOperation({ summary: 'Remove um item do carrinho' })
  @ApiParam({ name: 'itemId', description: 'Identificador do item do carrinho', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Item removido do carrinho com sucesso',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Item do carrinho não encontrado' })
  @Delete('items/:itemId')
  removeItem(@Param('itemId', ParseIntPipe) itemId: number, @CurrentUser() currentUser: User) {
    return this.removeCartItemUseCase.execute(itemId, currentUser);
  }

  @ApiOperation({ summary: 'Remove todos os itens do carrinho do usuário autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Carrinho esvaziado com sucesso',
    type: CartResponseDto,
  })
  @Delete()
  clear(@CurrentUser() currentUser: User) {
    return this.clearCartUseCase.execute(currentUser);
  }
}
