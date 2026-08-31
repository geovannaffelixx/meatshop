import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPerson } from '../../delivery/entities/delivery-person.entity';
import { DeliveryPersonStatus } from '../../delivery/enums/delivery-person-status.enum';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { Unit } from '../../units/entities/unit.entity';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { User } from '../../users/entities/user.entity';
import { Order } from '../entities/order.entity';

@Injectable()
export class OrderAuthorizationService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(UserUnit)
    private readonly userUnitRepository: Repository<UserUnit>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
  ) {}

  assertOwnsOrder(order: Order, currentUser: User): void {
    if (order.client_id !== currentUser.id) {
      throw new NotFoundException('Order not found');
    }
  }

  async assertCanManageOrder(order: Order, currentUser: User): Promise<void> {
    if (currentUser.global_role === GlobalRole.SUPER_ADMIN) {
      return;
    }

    const unit = await this.unitRepository.findOne({
      where: { id: order.unit_id },
    });
    if (unit?.admin_id === currentUser.id) {
      return;
    }

    const membership = await this.userUnitRepository.findOne({
      where: {
        unit_id: order.unit_id,
        user_id: currentUser.id,
        status: UserUnitStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Only unit staff or a super admin can perform this action');
    }
  }

  async assertCanApproveDeliveryPerson(currentUser: User): Promise<void> {
    if (currentUser.global_role === GlobalRole.SUPER_ADMIN) {
      return;
    }

    const isUnitAdmin = await this.unitRepository.exists({
      where: { admin_id: currentUser.id },
    });

    if (!isUnitAdmin) {
      throw new ForbiddenException(
        'Only a unit admin or a super admin can approve a delivery person',
      );
    }
  }

  async getActiveDeliveryPerson(currentUser: User): Promise<DeliveryPerson> {
    const deliveryPerson = await this.deliveryPersonRepository.findOne({
      where: { user_id: currentUser.id },
    });

    if (!deliveryPerson || deliveryPerson.status !== DeliveryPersonStatus.ACTIVE) {
      throw new ForbiddenException('You are not an active delivery person');
    }

    return deliveryPerson;
  }

  assertIsAssignedDeliveryPerson(order: Order, deliveryPerson: DeliveryPerson): void {
    if (order.delivery_person_id !== deliveryPerson.id) {
      throw new ForbiddenException('This order is not assigned to you');
    }
  }

  async assertDeliveryPersonCanServeUnit(
    deliveryPerson: DeliveryPerson,
    unitId: number,
  ): Promise<void> {
    const membership = await this.userUnitRepository.findOne({
      where: {
        user_id: deliveryPerson.user_id,
        unit_id: unitId,
        local_role: LocalRole.DELIVERY,
        status: UserUnitStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Delivery person is not active in this unit');
    }
  }
}
