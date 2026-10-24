import {
  PanelListQueryDto,
  paginatedResult,
  searchPattern,
} from '../../common/dtos/panel-list-query.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { User } from '../../users/entities/user.entity';
import { Unit } from '../entities/unit.entity';
import { UserUnit } from '../entities/user-unit.entity';
import { UnitAuthorizationService } from '../services/unit-authorization.service';

@Injectable()
export class ListUnitMembersUseCase {
  constructor(
    @InjectRepository(Unit) private readonly unitRepository: Repository<Unit>,
    @InjectRepository(UserUnit)
    private readonly membershipRepository: Repository<UserUnit>,
    private readonly authorization: UnitAuthorizationService,
  ) {}

  async execute(unitId: number, currentUser: User, filters?: PanelListQueryDto) {
    const unit = await this.unitRepository.findOne({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    await this.authorization.assertHasPermission(
      currentUser,
      unitId,
      UnitPermission.MANAGE_MEMBERS,
    );

    const options = {
      where: filters?.search?.trim()
        ? [
            { unit_id: unitId, user: { name: ILike(searchPattern(filters.search)) } },
            { unit_id: unitId, user: { email: ILike(searchPattern(filters.search)) } },
          ]
        : { unit_id: unitId },
      relations: { user: true },
      order: { created_at: 'ASC' as const, id: 'ASC' as const },
    };
    const [memberships, total] =
      filters?.paginated === 'true'
        ? await this.membershipRepository.findAndCount({
            ...options,
            skip: (filters.page - 1) * filters.limit,
            take: filters.limit,
          })
        : [await this.membershipRepository.find(options), 0];
    const data = memberships.map(({ id, user, local_role, status, created_at }) => ({
      id,
      user: { id: user.id, name: user.name, email: user.email },
      local_role,
      status,
      created_at,
    }));
    return filters?.paginated === 'true' ? paginatedResult(data, total, filters) : data;
  }
}
