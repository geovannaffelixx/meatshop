export type DeliveryLocation = {
  latitude: number;
  longitude: number;
  recordedAt: string;
};

export type DeliveryVerification = {
  required: boolean;
  verifiedAt: string | null;
  expiresAt: string | null;
  lockedUntil: string | null;
};

export type LiveDelivery = {
  orderId: number;
  status: string;
  deliveryStatus: string | null;
  deliveryStep: string | null;
  orderDate: string;
  scheduledDeliveryDate: string | null;
  client: { id: number; name: string };
  destination: {
    label: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  deliveryPerson: {
    id: number;
    name: string;
    rating: number | null;
    vehicle: {
      type: string;
      model: string;
      plate: string;
      color: string;
    } | null;
  } | null;
  location: DeliveryLocation | null;
  pickupVerification: DeliveryVerification;
  deliveryVerification: DeliveryVerification;
};

export type UnitDeliveryPerson = {
  membershipId: number;
  membershipStatus: "ACTIVE" | "INACTIVE";
  user: { id: number; name: string; email: string };
  deliveryPersonId: number | null;
  profileStatus: "PENDING" | "ACTIVE" | "INACTIVE" | "NOT_REGISTERED";
  rating: number | null;
  vehicle: {
    type: string;
    model: string;
    plate: string;
    color: string;
  } | null;
  activeOrderId: number | null;
};

export type LiveDeliveriesSnapshot = {
  unit: {
    id: number;
    name: string;
    latitude: number | null;
    longitude: number | null;
  };
  deliveries: LiveDelivery[];
  generatedAt: string;
};

export type LocationUpdatedEvent = {
  orderId: number;
  unitId: number;
  deliveryPersonId: number | null;
  latitude: number;
  longitude: number;
  recordedAt: string;
};
