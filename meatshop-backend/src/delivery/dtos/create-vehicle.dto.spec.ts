import { validate } from 'class-validator';
import { CreateVehicleDto } from './create-vehicle.dto';
import { VehicleType } from '../enums/vehicle-type.enum';

describe('CreateVehicleDto', () => {
  function vehicle(type: VehicleType, plate = '') {
    return Object.assign(new CreateVehicleDto(), {
      type,
      plate,
      model: 'Modelo',
      color: 'Preto',
      year: 2026,
    });
  }

  it.each([VehicleType.BIKE, VehicleType.SCOOTER])(
    'accepts %s without a license plate',
    async (type) => {
      expect(await validate(vehicle(type))).toHaveLength(0);
    },
  );

  it.each([VehicleType.MOTORCYCLE, VehicleType.CAR])(
    'requires a license plate for %s',
    async (type) => {
      expect((await validate(vehicle(type))).some((error) => error.property === 'plate')).toBe(
        true,
      );
    },
  );
});
