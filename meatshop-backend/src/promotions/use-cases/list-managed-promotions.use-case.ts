import { BadRequestException, Injectable } from '@nestjs/common';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { FilterPromotionsDto } from '../dtos/filter-promotions.dto';
import { ListPromotionsUseCase } from './list-promotions.use-case';

@Injectable()
export class ListManagedPromotionsUseCase {
  constructor(
    private readonly authorization: UnitAuthorizationService,
    private readonly list: ListPromotionsUseCase,
  ) {}

  async execute(filters: FilterPromotionsDto, user: User) {
    if (!filters.unit_id) throw new BadRequestException('Choose a unit');
    await this.authorization.assertHasPermission(
      user,
      filters.unit_id,
      UnitPermission.MANAGE_PRODUCTS,
    );
    return this.list.execute({ ...filters, marketplace: undefined });
  }
}
