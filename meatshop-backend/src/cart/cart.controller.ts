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

  @ApiOperation({ summary: 'Gets the authenticated user cart' })
  @ApiResponse({
    status: 200,
    description: 'Cart returned successfully',
    type: CartResponseDto,
  })
  @Get()
  getCart(@CurrentUser() currentUser: User) {
    return this.getCartUseCase.execute(currentUser);
  }

  @ApiOperation({ summary: 'Adds an item to the authenticated user cart' })
  @ApiResponse({
    status: 201,
    description: 'Item added to cart successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @Post('items')
  addItem(@Body() dto: AddCartItemDto, @CurrentUser() currentUser: User) {
    return this.addItemToCartUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Updates a cart item quantity' })
  @ApiParam({
    name: 'itemId',
    description: 'Cart item identifier',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Cart item updated successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  @Patch('items/:itemId')
  updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateCartItemUseCase.execute(itemId, dto, currentUser);
  }

  @ApiOperation({ summary: 'Removes a cart item' })
  @ApiParam({
    name: 'itemId',
    description: 'Cart item identifier',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Cart item removed successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  @Delete('items/:itemId')
  removeItem(@Param('itemId', ParseIntPipe) itemId: number, @CurrentUser() currentUser: User) {
    return this.removeCartItemUseCase.execute(itemId, currentUser);
  }

  @ApiOperation({
    summary: 'Removes all items from the authenticated user cart',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
    type: CartResponseDto,
  })
  @Delete()
  clear(@CurrentUser() currentUser: User) {
    return this.clearCartUseCase.execute(currentUser);
  }
}
