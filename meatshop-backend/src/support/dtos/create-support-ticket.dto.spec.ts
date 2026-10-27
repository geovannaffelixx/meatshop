import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { encryptedColumnTransformer } from '../../common/security/field-encryption';
import { CreateSupportTicketDto } from './create-support-ticket.dto';

describe('support contact', () => {
  const dto = (contact?: unknown) =>
    plainToInstance(CreateSupportTicketDto, {
      category: 'TECHNICAL',
      subject: 'Help',
      contact,
    });
  it('normalizes whitespace, accepts empty contact and rejects overlong or nonstring values', async () => {
    expect(dto('  contact@example.com \n ').contact).toBe('contact@example.com');
    expect(dto('   ').contact).toBeUndefined();
    expect(await validate(dto())).toHaveLength(0);
    expect(await validate(dto('x'.repeat(150)))).toHaveLength(0);
    expect(await validate(dto('x'.repeat(151)))).not.toHaveLength(0);
    expect(await validate(dto(123))).not.toHaveLength(0);
  });
  it('encrypts contact at rest and restores authorized responses', () => {
    const value = 'contact@example.com';
    const cipher = encryptedColumnTransformer.to(value);
    expect(cipher).not.toContain(value);
    expect(cipher).toMatch(/^enc:v1:/);
    expect(encryptedColumnTransformer.from(cipher)).toBe(value);
    expect(encryptedColumnTransformer.to(null)).toBeNull();
  });
});
