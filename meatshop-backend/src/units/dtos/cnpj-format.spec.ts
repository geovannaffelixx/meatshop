import { validateSync } from 'class-validator';
import { CreateUnitDto } from './create-unit.dto';
import { RegisterUnitDetailsDto } from '../../auth/dto/register-unit-details.dto';

describe.each([CreateUnitDto, RegisterUnitDetailsDto])('CNPJ input format in %s', (Dto) => {
  it.each(['11222333000181', '00000000E08G12'])(
    'accepts supported unmasked formats: %s',
    (cnpj) => {
      const value = Object.assign(new Dto(), { cnpj });
      expect(validateSync(value).some((error) => error.property === 'cnpj')).toBe(false);
    },
  );
  it.each(['00000000E08GAB', '11.222.333/0001-81', '00000000e08g12', '123'])(
    'rejects malformed API values: %s',
    (cnpj) => {
      const value = Object.assign(new Dto(), { cnpj });
      expect(validateSync(value).some((error) => error.property === 'cnpj')).toBe(true);
    },
  );
});
