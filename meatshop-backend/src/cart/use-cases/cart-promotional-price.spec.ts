/* global jest */
import type { Repository } from 'typeorm';
import type { Promotion } from '../../promotions/entities/promotion.entity';
import { PromotionalPriceService } from '../../promotions/services/promotional-price.service';
import type { User } from '../../users/entities/user.entity';
import type { Cart } from '../entities/cart.entity';
import type { CartItem } from '../entities/cart-item.entity';
import type { CartAccessService } from '../services/cart-access.service';
import type { CartProductPolicyService } from '../services/cart-product-policy.service';
import { GetCartUseCase } from './get-cart.use-case';
import { UpdateCartItemUseCase } from './update-cart-item.use-case';

const user = { id: 3 } as User;
const cart = { id: 11, user_id: 3 } as Cart;
const product = {
  id: 5,
  price: '100.00',
  unit_id: 2,
  name: 'Picanha',
  unit: { id: 2, name: 'Casa' },
};
const promotionalPrice = () =>
  new PromotionalPriceService({
    find: jest.fn(async () => [
      {
        product_id: 5,
        promotional_price: null,
        discount_percentage: '20',
      } as unknown as Promotion,
    ]),
  } as unknown as Repository<Promotion>);
const storedItem = () =>
  ({
    id: 1,
    cart_id: 11,
    product_id: 5,
    quantity: 2,
    unit_price: '100.00',
    product,
    stock: { quantity: 10 },
  }) as unknown as CartItem;

describe('cart promotional price', () => {
  it('shows the current promotional price when reading the cart', async () => {
    const builder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndMapOne: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [storedItem()]),
    };
    const useCase = new GetCartUseCase(
      { createQueryBuilder: () => builder } as unknown as Repository<CartItem>,
      {} as CartAccessService,
      promotionalPrice(),
    );

    const response = await useCase.execute(user, cart);

    expect(builder.select).toHaveBeenCalledWith(expect.arrayContaining(['product.price']));
    expect(response.items[0].unit_price).toBe(80);
    expect(response.total).toBe(160);
  });

  it('shows the current promotional price after updating an item quantity', async () => {
    const query = jest.fn(async () => [{ ...storedItem(), quantity: 3, available_stock: 10 }]);
    const useCase = new UpdateCartItemUseCase(
      { query } as unknown as Repository<CartItem>,
      {
        findOwnCartItemForUpdate: jest.fn(async () => ({
          ...storedItem(),
          cart,
        })),
      } as unknown as CartAccessService,
      {
        validateLoaded: jest.fn(() => product),
      } as unknown as CartProductPolicyService,
      promotionalPrice(),
    );

    const response = await useCase.execute(1, { quantity: 3 }, user);

    expect((query.mock.calls[0] as unknown[])[0]).toContain("'price',product.price");
    expect(response.items[0].unit_price).toBe(80);
    expect(response.total).toBe(240);
  });
});
