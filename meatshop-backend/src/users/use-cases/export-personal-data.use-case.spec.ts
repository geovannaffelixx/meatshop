import { removeExportSecrets } from './export-personal-data.use-case';

describe('Personal data export', () => {
  it('preserves personal records while excluding credentials recursively', () => {
    expect(
      removeExportSecrets({
        email: 'user@example.com',
        password_hash: 'secret',
        orders: [
          { total_amount: 10, delivery_code_ciphertext: 'secret', tracking_session_id: 'secret' },
        ],
        payment: { last_four: '1234', mp_card_id: 'provider-secret' },
      }),
    ).toEqual({
      email: 'user@example.com',
      orders: [{ total_amount: 10 }],
      payment: { last_four: '1234' },
    });
  });
});
