import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { DeliveryPerson } from '../entities/delivery-person.entity';
import { Vehicle } from '../entities/vehicle.entity';
import {
  PanelListQueryDto,
  paginatedResult,
  searchPattern,
} from '../../common/dtos/panel-list-query.dto';

@Injectable()
export class ListUnitDeliveryPeopleUseCase {
  constructor(
    @InjectRepository(UserUnit)
    private readonly membershipRepository: Repository<UserUnit>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(unitId: number, currentUser: User, filters?: PanelListQueryDto) {
    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      unitId,
      UnitPermission.VIEW_DELIVERIES,
    );
    const query = this.membershipRepository
      .createQueryBuilder('membership')
      .leftJoinAndSelect('membership.user', 'user')
      .where('membership.unit_id = :unitId', { unitId })
      .andWhere('membership.local_role = :role', { role: LocalRole.DELIVERY })
      .orderBy('membership.created_at', 'ASC')
      .addOrderBy('membership.id', 'ASC');
    if (filters?.search?.trim()) {
      query.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: searchPattern(filters.search),
      });
    }
    const paginated = filters?.paginated === 'true';
    if (paginated) query.skip((filters.page - 1) * filters.limit).take(filters.limit);
    const [memberships, total] = await query.getManyAndCount();
    const userIds = memberships.map(({ user_id }) => user_id);
    const people = userIds.length
      ? await this.deliveryPersonRepository.find({
          where: { user_id: In(userIds) },
        })
      : [];
    const personIds = people.map(({ id }) => id);
    const vehicles = personIds.length
      ? await this.vehicleRepository.find({
          where: { delivery_person_id: In(personIds), is_active: true, is_enabled: true },
        })
      : [];
    const activeOrders = personIds.length
      ? await this.orderRepository.find({
          where: {
            delivery_person_id: In(personIds),
            status: In([OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY]),
          },
        })
      : [];

    const peopleByUser = new Map(people.map((person) => [person.user_id, person]));
    const vehicleByPerson = new Map(
      vehicles.map((vehicle) => [vehicle.delivery_person_id, vehicle]),
    );
    const activeOrderByPerson = new Map(
      activeOrders.map((order) => [order.delivery_person_id, order.id]),
    );

    const data = memberships.map((membership) => {
      const person = peopleByUser.get(membership.user_id);
      const vehicle = person ? vehicleByPerson.get(person.id) : undefined;
      return {
        membershipId: membership.id,
        membershipStatus: membership.status,
        user: {
          id: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
        },
        deliveryPersonId: person?.id ?? null,
        isOnline: person?.is_online ?? false,
        profileStatus: person?.status ?? 'NOT_REGISTERED',
        rating: person?.average_rating == null ? null : Number(person.average_rating),
        vehicle: vehicle
          ? {
              type: vehicle.type,
              model: vehicle.model,
              plate: vehicle.plate,
              color: vehicle.color,
            }
          : null,
        activeOrderId: person ? (activeOrderByPerson.get(person.id) ?? null) : null,
      };
    });
    return paginated ? paginatedResult(data, total, filters) : data;
  }
}
