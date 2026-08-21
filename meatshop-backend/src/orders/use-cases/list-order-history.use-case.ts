import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { Order } from '../entities/order.entity';

@Injectable()
export class ListOrderHistoryUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(currentUser: User): Promise<Order[]> {
    if (currentUser.global_role === GlobalRole.SUPER_ADMIN) {
      return this.orderRepository.find({
        relations: ['client'],
        order: { order_date: 'DESC' },
      });
    }

    const managedUnitIds = await this.unitAuthorizationService.getManagedUnitIds(currentUser.id);
    if (managedUnitIds.length > 0) {
      return this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.client', 'client')
        .where('order.unit_id IN (:...unitIds)', { unitIds: managedUnitIds })
        .orWhere('order.client_id = :userId', { userId: currentUser.id })
        .orderBy('order.order_date', 'DESC')
        .getMany();
    }

    return this.orderRepository.find({
      where: { client_id: currentUser.id },
      relations: ['client'],
      order: { order_date: 'DESC' },
    });
  }
}
