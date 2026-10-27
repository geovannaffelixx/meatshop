import { expenseTypeLabel, expensePaymentLabel } from './expense-labels';

it('translates expense enums and preserves unknown values', () => {
  expect(expenseTypeLabel('Purchases')).toBe('Compras');
  expect(expensePaymentLabel('Bank Slip')).toBe('Boleto');
  expect(expenseTypeLabel('New')).toBe('New');
  expect(expensePaymentLabel('New')).toBe('New');
});
