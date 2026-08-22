import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { User } from '../../users/entities/user.entity';
import { UserUnit } from '../entities/user-unit.entity';
import { UnitAuthorizationService } from '../services/unit-authorization.service';

@Injectable()
export class RemoveUnitMemberUseCase {
  constructor(
    @InjectRepository(UserUnit) private readonly membershipRepository: Repository<UserUnit>,
    private readonly authorization: UnitAuthorizationService,
  ) {}

  async execute(unitId: number, membershipId: number, currentUser: User): Promise<void> {
    await this.authorization.assertHasPermission(
      currentUser,
      unitId,
      UnitPermission.MANAGE_MEMBERS,
    );
    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId, unit_id: unitId },
    });
    if (!membership) throw new NotFoundException('Unit member not found');
    if (membership.local_role === LocalRole.OWNER) {
      throw new ForbiddenException('The unit owner cannot be removed');
    }
    await this.membershipRepository.remove(membership);
  }
}
