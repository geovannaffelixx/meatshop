import { CreateAddressDto } from '../../users/dtos/create-address.dto';
import { CreateUnitDto } from '../../units/dtos/create-unit.dto';
import { RegisterUnitDetailsDto } from '../../auth/dto/register-unit-details.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateLocationDto, SharingConsentDto } from './update-location.dto';
const valid = {
  latitude: 0,
  longitude: 0,
  accuracy: 12.345678,
  captured_at: new Date().toISOString(),
  sample_id: '11111111-1111-4111-8111-111111111111',
  session_id: '22222222-2222-4222-8222-222222222222',
  is_mocked: false,
};
describe('location wire contract', () => {
  it('rejects empty, boolean and array coordinates in all address creation flows', async () => {
    for (const dto of [CreateAddressDto, CreateUnitDto, RegisterUnitDetailsDto]) {
      for (const latitude of ['', false, []]) {
        const errors = await validate(
          plainToInstance(
            dto as typeof CreateAddressDto,
            { latitude },
            { enableImplicitConversion: true },
          ),
        );
        expect(errors.map((error) => error.property)).toContain('latitude');
      }
    }
  });
  it('accepts real GPS accuracy and valid zero coordinates', async () => {
    expect(
      await validate(plainToInstance(UpdateLocationDto, valid, { enableImplicitConversion: true })),
    ).toHaveLength(0);
  });
  it.each([null, '', false, '0'])('rejects coerced latitude %p', async (latitude) => {
    expect(
      (
        await validate(
          plainToInstance(
            UpdateLocationDto,
            { ...valid, latitude },
            { enableImplicitConversion: true },
          ),
        )
      ).map((e) => e.property),
    ).toContain('latitude');
  });
  it('does not interpret a string as consent', async () => {
    expect(
      await validate(
        plainToInstance(
          SharingConsentDto,
          { enabled: 'false' },
          { enableImplicitConversion: true },
        ),
      ),
    ).not.toHaveLength(0);
  });
});
