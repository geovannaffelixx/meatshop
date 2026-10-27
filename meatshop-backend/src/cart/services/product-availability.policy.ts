import type { Product } from '../../products/entities/product.entity';

export function isPurchasableProduct(product: Product | null | undefined): product is Product {
  return Boolean(product?.active && product.category?.active);
}

export function isValidProductQuantity(product: Product, quantity: number): boolean {
  const measurement = product.unit_of_measure?.trim().toUpperCase();
  return (
    Number.isFinite(quantity) &&
    quantity > 0 &&
    (!['UN', 'PCT'].includes(measurement) || Number.isInteger(quantity))
  );
}

export function hasSufficientStock(available: number, quantity: number): boolean {
  return (
    Number.isFinite(available) && Number.isFinite(quantity) && available >= quantity && quantity > 0
  );
}
