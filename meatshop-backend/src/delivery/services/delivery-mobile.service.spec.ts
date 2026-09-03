import { BadRequestException } from "@nestjs/common";
import { DeliveryPersonStatus } from "../enums/delivery-person-status.enum";
import { DeliveryMobileService } from "./delivery-mobile.service";

describe("DeliveryMobileService", () => {
  const user = { id: 7, name: "Ana" } as any;

  function setup(personOverrides: Record<string, unknown> = {}) {
    const person = {
      id: 3,
      user_id: 7,
      status: DeliveryPersonStatus.ACTIVE,
      is_online: false,
      average_rating: 4.8,
      availability_updated_at: null,
      ...personOverrides,
    };
    const access = {
      getOwnDeliveryPerson: jest.fn().mockResolvedValue(person),
      getOwnActiveDeliveryPerson: jest.fn().mockResolvedValue(person),
      deliveryPersonRepository: { save: jest.fn(async (value) => value) },
    } as any;
    const vehicles = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 1, is_active: true, is_enabled: true }),
      find: jest.fn().mockResolvedValue([]),
    } as any;
    const service = new DeliveryMobileService(
      access,
      vehicles,
      { find: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, person, access, vehicles };
  }

  it("persists online availability only for approved driver with active vehicle", async () => {
    const { service, person, access } = setup();
    await service.availability(user, true);
    expect(person.is_online).toBe(true);
    expect(access.deliveryPersonRepository.save).toHaveBeenCalledWith(person);
  });

  it("refuses online availability without an active vehicle", async () => {
    const { service, vehicles } = setup();
    vehicles.findOne.mockResolvedValue(null);
    await expect(service.availability(user, true)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
