import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GlobalRole } from '../common/enums/global-role.enum';
import { LocalRole } from '../common/enums/local-role.enum';
import { UserUnitStatus } from '../common/enums/user-unit-status.enum';
import { UnitPermission } from '../common/enums/unit-permission.enum';
import { Unit } from '../units/entities/unit.entity';
import { UserUnit } from '../units/entities/user-unit.entity';
import { UnitAuthorizationService } from '../units/services/unit-authorization.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReportAccessService {
  constructor(
    private readonly db: DataSource,
    private readonly authorization: UnitAuthorizationService,
  ) {}

  async assert(user: User, unitId: number, format: string): Promise<Unit> {
    const admin = user.global_role === GlobalRole.SUPER_ADMIN;
    if (!admin && format === 'json')
      throw new ForbiddenException(
        'O formato JSON está disponível apenas para a administração da plataforma.',
      );
    if (!admin) {
      const membership = await this.db
        .getRepository(UserUnit)
        .findOneBy({ user_id: user.id, unit_id: unitId, status: UserUnitStatus.ACTIVE });
      if (!membership || ![LocalRole.OWNER, LocalRole.MANAGER].includes(membership.local_role))
        throw new ForbiddenException(
          'Apenas o proprietário e o gerente da unidade podem exportar relatórios.',
        );
    }
    await this.authorization.resolveRequiredUnitId(user, unitId, UnitPermission.VIEW_DASHBOARD);
    const unit = await this.db.getRepository(Unit).findOneBy({ id: unitId });
    if (!unit) throw new NotFoundException('A unidade selecionada não foi encontrada.');
    return unit;
  }

  async units(user: User) {
    if (user.global_role !== GlobalRole.SUPER_ADMIN)
      throw new ForbiddenException('Acesso restrito à administração da plataforma.');
    return this.db
      .getRepository(Unit)
      .find({ select: { id: true, name: true }, order: { name: 'ASC' } });
  }
}
