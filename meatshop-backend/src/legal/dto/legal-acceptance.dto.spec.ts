import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LegalAcceptanceDto } from './legal-acceptance.dto';

describe('LegalAcceptanceDto', () => {
  it.each([false, 'true', 'false', 1, null])(
    'rejects non-explicit acceptance %s',
    async (accepted) => {
      const dto = plainToInstance(
        LegalAcceptanceDto,
        {
          accepted,
          channel: 'mobile',
          document_ids: [1, 2],
        },
        { enableImplicitConversion: true },
      );
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );
  it('does not coerce a representation declaration from a string', async () => {
    const dto = plainToInstance(
      LegalAcceptanceDto,
      {
        accepted: true,
        authorized_representative: 'true',
        channel: 'web',
        document_ids: [1, 2, 3],
      },
      { enableImplicitConversion: true },
    );
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects duplicate versions', async () => {
    const dto = plainToInstance(LegalAcceptanceDto, {
      accepted: true,
      channel: 'web',
      document_ids: [1, 1],
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
