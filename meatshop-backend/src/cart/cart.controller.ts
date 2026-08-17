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
import { User } from '../users/entities/user.entity';
import { AddCartItemDto } from './dtos/add-cart-item.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';
import { AddItemToCartUseCase } from './use-cases/add-item-to-cart.use-case';
import { ClearCartUseCase } from './use-cases/clear-cart.use-case';
import { GetCartUseCase } from './use-cases/get-cart.use-case';
import { RemoveCartItemUseCase } from './use-cases/remove-cart-item.use-case';
import { UpdateCartItemUseCase } from './use-cases/update-cart-item.use-case';

@Controller('cart')
export class CartController {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly addItemToCartUseCase: AddItemToCartUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  @Get()
  getCart(@CurrentUser() currentUser: User) {
    return this.getCartUseCase.execute(currentUser);
  }

  @Post('items')
  addItem(@Body() dto: AddCartItemDto, @CurrentUser() currentUser: User) {
    return this.addItemToCartUseCase.execute(dto, currentUser);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateCartItemUseCase.execute(itemId, dto, currentUser);
  }

  @Delete('items/:itemId')
  removeItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.removeCartItemUseCase.execute(itemId, currentUser);
  }

  @Delete()
  clear(@CurrentUser() currentUser: User) {
    return this.clearCartUseCase.execute(currentUser);
  }
}
