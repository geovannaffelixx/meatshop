import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { User } from '../../users/entities/user.entity';
import { UpdateUnitMemberDto } from '../dtos/update-unit-member.dto';
import { UserUnit } from '../entities/user-unit.entity';
import { UnitAuthorizationService } from '../services/unit-authorization.service';

@Injectable()
export class UpdateUnitMemberUseCase {
  constructor(
    @InjectRepository(UserUnit) private readonly membershipRepository: Repository<UserUnit>,
    private readonly authorization: UnitAuthorizationService,
  ) {}

  async execute(unitId: number, membershipId: number, dto: UpdateUnitMemberDto, currentUser: User) {
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
      throw new ForbiddenException('The unit owner cannot be changed through this endpoint');
    }
    if (
      dto.local_role === LocalRole.MANAGER &&
      currentUser.global_role !== GlobalRole.SUPER_ADMIN
    ) {
      const actor = await this.membershipRepository.findOne({
        where: { user_id: currentUser.id, unit_id: unitId },
      });
      if (actor?.local_role !== LocalRole.OWNER) {
        throw new ForbiddenException('Only the unit owner can assign managers');
      }
    }

    Object.assign(membership, dto);
    return this.membershipRepository.save(membership);
  }
}
