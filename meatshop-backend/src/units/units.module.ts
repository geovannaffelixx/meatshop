import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { BusinessHours } from './entities/business-hours.entity';
import { Unit } from './entities/unit.entity';
import { UserUnit } from './entities/user-unit.entity';
import { UnitAuthorizationService } from './services/unit-authorization.service';
import { UnitsController } from './units.controller';
import { AddUserToUnitUseCase } from './use-cases/add-user-to-unit.use-case';
import { CreateUnitUseCase } from './use-cases/create-unit.use-case';
import { ListBusinessHoursUseCase } from './use-cases/list-business-hours.use-case';
import { ListManagedUnitsUseCase } from './use-cases/list-managed-units.use-case';
import { SetBusinessHoursUseCase } from './use-cases/set-business-hours.use-case';
import { UpdateUnitUseCase } from './use-cases/update-unit.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, UserUnit, BusinessHours]), UsersModule],
  controllers: [UnitsController],
  providers: [
    CreateUnitUseCase,
    UpdateUnitUseCase,
    AddUserToUnitUseCase,
    ListBusinessHoursUseCase,
    ListManagedUnitsUseCase,
    SetBusinessHoursUseCase,
    UnitAuthorizationService,
  ],
  exports: [TypeOrmModule, UnitAuthorizationService],
})
export class UnitsModule {}
