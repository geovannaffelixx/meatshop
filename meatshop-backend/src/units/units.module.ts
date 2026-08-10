import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Unit } from './entities/unit.entity';
import { UserUnit } from './entities/user-unit.entity';
import { UnitsController } from './units.controller';
import { AddUserToUnitUseCase } from './use-cases/add-user-to-unit.use-case';
import { CreateUnitUseCase } from './use-cases/create-unit.use-case';
import { UpdateUnitUseCase } from './use-cases/update-unit.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, UserUnit]), UsersModule],
  controllers: [UnitsController],
  providers: [CreateUnitUseCase, UpdateUnitUseCase, AddUserToUnitUseCase],
})
export class UnitsModule {}
