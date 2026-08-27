import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SupportContextService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(UserUnit) private readonly memberships: Repository<UserUnit>,
  ) {}

  async validate(user: User, unitId?: number, orderId?: number): Promise<void> {
    if (user.global_role === GlobalRole.SUPER_ADMIN) return;

    const order = orderId ? await this.orders.findOne({ where: { id: orderId } }) : null;
    if (orderId && !order) throw new NotFoundException('Pedido não encontrado');
    if (order && unitId && order.unit_id !== unitId) {
      throw new ForbiddenException('O pedido não pertence à unidade informada');
    }
    if (order?.client_id === user.id) return;

    const contextualUnitId = unitId ?? order?.unit_id;
    if (!contextualUnitId) return;
    const membership = await this.memberships.findOne({
      where: { user_id: user.id, unit_id: contextualUnitId, status: UserUnitStatus.ACTIVE },
    });
    if (!membership) throw new ForbiddenException('Você não possui acesso a este contexto');
  }
}
