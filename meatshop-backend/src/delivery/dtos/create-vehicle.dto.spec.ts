import { validate } from 'class-validator';
import { CreateVehicleDto } from './create-vehicle.dto';
import { VehicleType } from '../enums/vehicle-type.enum';
import { CreateDeliveryPersonDto } from './create-delivery-person.dto';
import { CreateUnitMemberDto } from '../../units/dtos/create-unit-member.dto';

describe('CreateVehicleDto', () => {
  it.each(['SCOOTER', 'ON_FOOT', 'Patinete', ''])(
    'rejects unsupported type %s in every registration contract',
    async (type) => {
      const definitions = [
        Object.assign(new CreateVehicleDto(), { type }),
        Object.assign(new CreateDeliveryPersonDto(), { vehicle: type }),
        Object.assign(new CreateUnitMemberDto(), { local_role: 'DELIVERY', vehicle: type }),
      ];
      for (const dto of definitions) {
        const errors = await validate(dto);
        expect(
          errors.some((error) => error.property === 'vehicle' || error.property === 'type'),
        ).toBe(true);
      }
    },
  );

  it.each(Object.values(VehicleType))('accepts canonical delivery type %s', async (vehicle) => {
    expect(await validate(Object.assign(new CreateDeliveryPersonDto(), { vehicle }))).toHaveLength(
      0,
    );
  });

  function vehicle(type: VehicleType, plate = '') {
    return Object.assign(new CreateVehicleDto(), {
      type,
      plate,
      model: 'Modelo',
      color: 'Preto',
      year: 2026,
    });
  }

  it.each([VehicleType.BIKE])('accepts %s without a license plate', async (type) => {
    expect(await validate(vehicle(type))).toHaveLength(0);
  });

  it.each([VehicleType.MOTORCYCLE, VehicleType.CAR])(
    'requires a license plate for %s',
    async (type) => {
      expect((await validate(vehicle(type))).some((error) => error.property === 'plate')).toBe(
        true,
      );
    },
  );
});
