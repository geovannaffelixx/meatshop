import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { DeliveryPerson } from '../entities/delivery-person.entity';
import { DeliveryPersonStatus } from '../enums/delivery-person-status.enum';

@Injectable()
export class ApproveUnitDeliveryPersonUseCase {
  constructor(
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    @InjectRepository(UserUnit)
    private readonly membershipRepository: Repository<UserUnit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(
    unitId: number,
    deliveryPersonId: number,
    currentUser: User,
  ): Promise<DeliveryPerson> {
    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      unitId,
      UnitPermission.MANAGE_DELIVERIES,
    );
    const person = await this.deliveryPersonRepository.findOne({
      where: { id: deliveryPersonId },
    });
    if (!person) throw new NotFoundException('Delivery person not found');
    const membership = await this.membershipRepository.findOne({
      where: {
        user_id: person.user_id,
        unit_id: unitId,
        local_role: LocalRole.DELIVERY,
        status: UserUnitStatus.ACTIVE,
      },
    });
    if (!membership) {
      throw new NotFoundException('Delivery person is not linked to this unit');
    }
    if (person.status !== DeliveryPersonStatus.PENDING) {
      throw new BadRequestException('Delivery person is not pending approval');
    }
    person.status = DeliveryPersonStatus.ACTIVE;
    return this.deliveryPersonRepository.save(person);
  }
}
