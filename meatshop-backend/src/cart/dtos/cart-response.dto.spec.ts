import type { Cart } from '../entities/cart.entity';
import type { CartItem } from '../entities/cart-item.entity';
import { CartResponseDto } from './cart-response.dto';

describe('CartResponseDto', () => {
  const item = (id: number, unitId: number, unitName: string, price: number): CartItem =>
    ({
      id,
      product_id: id,
      quantity: 0.5,
      unit_price: price,
      product: {
        id,
        name: `Produto ${id}`,
        image_url: null,
        unit_of_measure: 'kg',
        unit_id: unitId,
        unit: { id: unitId, name: unitName, image_url: null },
      },
    }) as CartItem;

  it('keeps products from different units in one cart and groups the response', () => {
    const response = CartResponseDto.fromEntity(
      { id: 5 } as Cart,
      [item(10, 1, 'Unidade A', 20), item(20, 2, 'Unidade B', 30)],
      new Map([
        [10, 5],
        [20, 8],
      ]),
    );

    expect(response.items).toHaveLength(2);
    expect(response.groups.map((group) => group.unit_id)).toEqual([1, 2]);
    expect(response.total).toBe(25);
    expect(response.groups.map((group) => group.total)).toEqual([10, 15]);
  });
});
