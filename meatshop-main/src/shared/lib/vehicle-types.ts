export const VEHICLE_TYPES = [
  { value: "MOTORCYCLE", label: "Moto" },
  { value: "CAR", label: "Carro" },
  { value: "BIKE", label: "Bicicleta" },
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number]["value"];
