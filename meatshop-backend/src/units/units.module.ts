import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { DeliveryPerson } from '../delivery/entities/delivery-person.entity';
import { BusinessHours } from './entities/business-hours.entity';
import { Unit } from './entities/unit.entity';
import { UserUnit } from './entities/user-unit.entity';
import { UnitAuthorizationService } from './services/unit-authorization.service';
import { UnitPermissionPolicy } from './services/unit-permission.policy';
import { UnitsController } from './units.controller';
import { UnitsUploadController } from './units-upload.controller';
import { AddUserToUnitUseCase } from './use-cases/add-user-to-unit.use-case';
import { CreateUnitUseCase } from './use-cases/create-unit.use-case';
import { ListBusinessHoursUseCase } from './use-cases/list-business-hours.use-case';
import { ListManagedUnitsUseCase } from './use-cases/list-managed-units.use-case';
import { SetBusinessHoursUseCase } from './use-cases/set-business-hours.use-case';
import { UpdateUnitUseCase } from './use-cases/update-unit.use-case';
import { ListUnitMembersUseCase } from './use-cases/list-unit-members.use-case';
import { UpdateUnitMemberUseCase } from './use-cases/update-unit-member.use-case';
import { RemoveUnitMemberUseCase } from './use-cases/remove-unit-member.use-case';
import { CreateUnitMemberUseCase } from './use-cases/create-unit-member.use-case';
import { GetUnitSettingsUseCase } from './use-cases/get-unit-settings.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, UserUnit, BusinessHours, User, DeliveryPerson])],
  controllers: [UnitsController, UnitsUploadController],
  providers: [
    CreateUnitUseCase,
    UpdateUnitUseCase,
    AddUserToUnitUseCase,
    ListBusinessHoursUseCase,
    ListManagedUnitsUseCase,
    SetBusinessHoursUseCase,
    UnitAuthorizationService,
    UnitPermissionPolicy,
    ListUnitMembersUseCase,
    UpdateUnitMemberUseCase,
    RemoveUnitMemberUseCase,
    CreateUnitMemberUseCase,
    GetUnitSettingsUseCase,
  ],
  exports: [TypeOrmModule, UnitAuthorizationService, UnitPermissionPolicy],
})
export class UnitsModule {}
