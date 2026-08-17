import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { Unit } from '../../units/entities/unit.entity';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { User } from '../../users/entities/user.entity';
import { Order } from '../entities/order.entity';

@Injectable()
export class ListOrderHistoryUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(UserUnit)
    private readonly userUnitRepository: Repository<UserUnit>,
  ) {}

  async execute(currentUser: User): Promise<Order[]> {
    if (currentUser.global_role === GlobalRole.SUPER_ADMIN) {
      return this.orderRepository.find({ order: { order_date: 'DESC' } });
    }

    const managedUnitIds = await this.resolveManagedUnitIds(currentUser.id);
    if (managedUnitIds.length > 0) {
      return this.orderRepository
        .createQueryBuilder('order')
        .where('order.unit_id IN (:...unitIds)', { unitIds: managedUnitIds })
        .orWhere('order.client_id = :userId', { userId: currentUser.id })
        .orderBy('order.order_date', 'DESC')
        .getMany();
    }

    return this.orderRepository.find({
      where: { client_id: currentUser.id },
      order: { order_date: 'DESC' },
    });
  }

  private async resolveManagedUnitIds(userId: number): Promise<number[]> {
    const ownedUnits = await this.unitRepository.find({ where: { admin_id: userId } });
    const memberships = await this.userUnitRepository.find({
      where: { user_id: userId, status: UserUnitStatus.ACTIVE },
    });

    const ids = new Set<number>([
      ...ownedUnits.map((u) => u.id),
      ...memberships.map((m) => m.unit_id),
    ]);
    return Array.from(ids);
  }
}
