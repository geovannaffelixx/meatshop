import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { OrderItem } from "../../orders/entities/order-item.entity";
import { Order } from "../../orders/entities/order.entity";
import { DeliveryStatus } from "../../orders/enums/delivery-status.enum";
import { DeliveryType } from "../../orders/enums/delivery-type.enum";
import { OrderStatus } from "../../orders/enums/order-status.enum";
import { User } from "../../users/entities/user.entity";
import { UserUnit } from "../../units/entities/user-unit.entity";
import { UserUnitStatus } from "../../common/enums/user-unit-status.enum";
import { RejectDeliveryOfferDto } from "../dtos/reject-delivery-offer.dto";
import { UpdateDeliveryGoalDto } from "../dtos/update-delivery-goal.dto";
import { UpdateVehicleDto } from "../dtos/update-vehicle.dto";
import {
  DeliveryGoal,
  DeliveryGoalPeriod,
} from "../entities/delivery-goal.entity";
import { DeliveryOfferRejection } from "../entities/delivery-offer-rejection.entity";
import { Vehicle } from "../entities/vehicle.entity";
import { DeliveryPersonStatus } from "../enums/delivery-person-status.enum";
import { DeliveryPersonAccessService } from "./delivery-person-access.service";

const ACTIVE_STATUSES = [DeliveryStatus.PICKUP, DeliveryStatus.ON_THE_WAY];

@Injectable()
export class DeliveryMobileService {
  constructor(
    private readonly access: DeliveryPersonAccessService,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem) private readonly items: Repository<OrderItem>,
    @InjectRepository(DeliveryOfferRejection)
    private readonly rejections: Repository<DeliveryOfferRejection>,
    @InjectRepository(DeliveryGoal)
    private readonly goals: Repository<DeliveryGoal>,
    @InjectRepository(UserUnit)
    private readonly memberships: Repository<UserUnit>,
  ) {}

  async profile(user: User) {
    const person = await this.access.getOwnDeliveryPerson(user.id);
    const vehicles = await this.listVehicles(user);
    return {
      id: person.id,
      user_id: person.user_id,
      name: user.name,
      status: person.status,
      vehicle: person.vehicle,
      average_rating:
        person.average_rating === null ? null : Number(person.average_rating),
      is_online: person.is_online,
      availability_updated_at: person.availability_updated_at,
      vehicles,
    };
  }

  async availability(user: User, isOnline: boolean) {
    const person = await this.access.getOwnDeliveryPerson(user.id);
    if (isOnline && person.status !== DeliveryPersonStatus.ACTIVE) {
      throw new BadRequestException(
        "Only approved delivery people can go online",
      );
    }
    if (isOnline) {
      const activeVehicle = await this.vehicles.findOne({
        where: {
          delivery_person_id: person.id,
          is_active: true,
          is_enabled: true,
        },
      });
      if (!activeVehicle)
        throw new BadRequestException("An active vehicle is required");
    }
    person.is_online = isOnline;
    person.availability_updated_at = new Date();
    return this.access.deliveryPersonRepository.save(person);
  }

  async listVehicles(user: User) {
    const person = await this.access.getOwnDeliveryPerson(user.id);
    return this.vehicles.find({
      where: { delivery_person_id: person.id, is_enabled: true },
      order: { created_at: "ASC" },
    });
  }

  async updateVehicle(id: number, dto: UpdateVehicleDto, user: User) {
    const vehicle = await this.ownedVehicle(id, user);
    Object.assign(vehicle, dto);
    return this.vehicles.save(vehicle);
  }

  async deleteVehicle(id: number, user: User) {
    const vehicle = await this.ownedVehicle(id, user);
    if (vehicle.is_active)
      throw new ConflictException("The active vehicle cannot be deleted");
    vehicle.is_enabled = false;
    await this.vehicles.save(vehicle);
    return { deleted: true };
  }

  async available(user: User) {
    const person = await this.access.getOwnActiveDeliveryPerson(user.id);
    if (!person.is_online) return [];
    const memberships = await this.memberships.find({
      where: { user_id: user.id, status: UserUnitStatus.ACTIVE },
    });
    const unitIds = memberships.map((membership) => membership.unit_id);
    if (unitIds.length === 0) return [];
    const rejected = await this.rejections.find({
      where: { delivery_person_id: person.id },
    });
    const rejectedIds = new Set(rejected.map((item) => item.order_id));
    const orders = await this.orders.find({
      where: {
        delivery_type: DeliveryType.DELIVERY,
        status: OrderStatus.READY,
        delivery_status: DeliveryStatus.WAITING_DELIVERY_PERSON,
        unit_id: In(unitIds),
      },
      relations: { client: true, unit: true, address: true },
      order: { order_date: "ASC" },
    });
    return this.mapOrders(
      orders.filter((order) => !rejectedIds.has(order.id)),
      false,
    );
  }

  async active(user: User) {
    const person = await this.access.getOwnActiveDeliveryPerson(user.id);
    const order = await this.orders.findOne({
      where: {
        delivery_person_id: person.id,
        delivery_status: In(ACTIVE_STATUSES),
      },
      relations: { client: true, unit: true, address: true },
      order: { updated_at: "DESC" },
    });
    return order ? this.mapOrder(order, await this.orderItems(order.id)) : null;
  }

  async history(user: User) {
    const person = await this.access.getOwnDeliveryPerson(user.id);
    const orders = await this.orders.find({
      where: {
        delivery_person_id: person.id,
        delivery_status: DeliveryStatus.DELIVERED,
      },
      relations: { client: true, unit: true, address: true },
      order: { updated_at: "DESC" },
      take: 100,
    });
    return this.mapOrders(orders);
  }

  async reject(orderId: number, dto: RejectDeliveryOfferDto, user: User) {
    const person = await this.access.getOwnActiveDeliveryPerson(user.id);
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (
      !order ||
      order.status !== OrderStatus.READY ||
      order.delivery_status !== DeliveryStatus.WAITING_DELIVERY_PERSON
    ) {
      throw new NotFoundException("Delivery offer not found");
    }
    const existing = await this.rejections.findOne({
      where: { delivery_person_id: person.id, order_id: orderId },
    });
    await this.rejections.save(
      this.rejections.create({
        ...existing,
        delivery_person_id: person.id,
        order_id: orderId,
        reasons: dto.reasons,
      }),
    );
    return { rejected: true };
  }

  async earnings(user: User) {
    const person = await this.access.getOwnDeliveryPerson(user.id);
    const delivered = await this.orders.find({
      where: {
        delivery_person_id: person.id,
        delivery_status: DeliveryStatus.DELIVERED,
      },
      order: { updated_at: "DESC" },
      take: 365,
    });
    const entries = delivered.map((order) => ({
      id: String(order.id),
      delivery_person_id: String(person.id),
      order_id: String(order.id),
      label: `Pedido #${order.id}`,
      amount: Number(order.delivery_fee),
      created_at: order.updated_at,
    }));
    return {
      entries,
      total: entries.reduce((sum, item) => sum + item.amount, 0),
      deliveries: entries.length,
    };
  }

  async listGoals(user: User) {
    const person = await this.access.getOwnDeliveryPerson(user.id);
    const defaults: Record<DeliveryGoalPeriod, number> = {
      [DeliveryGoalPeriod.DAILY]: 150,
      [DeliveryGoalPeriod.WEEKLY]: 800,
      [DeliveryGoalPeriod.MONTHLY]: 3000,
    };
    let goals = await this.goals.find({
      where: { delivery_person_id: person.id },
    });
    if (goals.length === 0) {
      goals = await this.goals.save(
        Object.entries(defaults).map(([period, target]) =>
          this.goals.create({
            delivery_person_id: person.id,
            period: period as DeliveryGoalPeriod,
            target,
          }),
        ),
      );
    }
    return goals.map((goal) => ({ ...goal, target: Number(goal.target) }));
  }

  async updateGoal(
    period: DeliveryGoalPeriod,
    dto: UpdateDeliveryGoalDto,
    user: User,
  ) {
    const person = await this.access.getOwnDeliveryPerson(user.id);
    const goal = await this.goals.findOne({
      where: { delivery_person_id: person.id, period },
    });
    return this.goals.save(
      this.goals.create({
        ...goal,
        delivery_person_id: person.id,
        period,
        target: dto.target,
      }),
    );
  }

  private async ownedVehicle(id: number, user: User) {
    const person = await this.access.getOwnDeliveryPerson(user.id);
    const vehicle = await this.vehicles.findOne({
      where: { id, delivery_person_id: person.id, is_enabled: true },
    });
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    return vehicle;
  }

  private async mapOrders(orders: Order[], includeDestination = true) {
    const entries = await Promise.all(
      orders.map(async (order) =>
        this.mapOrder(
          order,
          await this.orderItems(order.id),
          includeDestination,
        ),
      ),
    );
    return entries;
  }

  private orderItems(orderId: number) {
    return this.items.find({
      where: { order_id: orderId },
      relations: { product: true },
    });
  }

  private mapOrder(
    order: Order,
    items: OrderItem[],
    includeDestination = true,
  ) {
    const address = order.address;
    const unit = order.unit;
    return {
      id: order.id,
      client_id: String(order.client_id),
      client_name: order.client?.name ?? "Cliente",
      unit_id: String(order.unit_id),
      unit_name: unit?.name ?? "Unidade",
      items: items
        .map(
          (item) => `${Number(item.quantity)}x ${item.product?.name ?? "Item"}`,
        )
        .join(", "),
      total_amount: Number(order.total_amount),
      delivery_fee: Number(order.delivery_fee),
      delivery_status: order.delivery_status,
      delivery_step: order.delivery_step,
      unit_lat: unit?.latitude === null ? null : Number(unit?.latitude),
      unit_lng: unit?.longitude === null ? null : Number(unit?.longitude),
      dest_lat:
        includeDestination && address?.latitude != null
          ? Number(address.latitude)
          : null,
      dest_lng:
        includeDestination && address?.longitude != null
          ? Number(address.longitude)
          : null,
      unit_address: unit ? this.address(unit) : {},
      delivery_address: address
        ? includeDestination
          ? this.address(address)
          : {
              city: address.city,
              state: address.state,
              neighborhood: address.neighborhood,
            }
        : {},
      updated_at: order.updated_at,
    };
  }

  private address(value: {
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string;
    state: string;
    zip_code: string;
  }) {
    return {
      street: value.street ?? "",
      number: value.number ?? "",
      complement: value.complement ?? "",
      neighborhood: value.neighborhood ?? "",
      city: value.city ?? "",
      state: value.state ?? "",
      zip_code: value.zip_code ?? "",
    };
  }
}
