import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressesController } from './addresses.controller';
import { Address } from './entities/address.entity';
import { User } from './entities/user.entity';
import { GetUserProfileUseCase } from './use-cases/get-user-profile.use-case';
import { CreateAddressUseCase } from './use-cases/create-address.use-case';
import { UpdateAddressUseCase } from './use-cases/update-address.use-case';
import { SetDefaultAddressUseCase } from './use-cases/set-default-address.use-case';
import { ListAddressesUseCase } from './use-cases/list-addresses.use-case';
import { GetAddressUseCase } from './use-cases/get-address.use-case';
import { DeleteAddressUseCase } from './use-cases/delete-address.use-case';
import { UsersController } from './users.controller';
import { UsersUploadController } from './users-upload.controller';
import { Unit } from '../units/entities/unit.entity';
import { UnitsModule } from '../units/units.module';
import { EmailModule } from '../email/email.module';
import { GetPanelContextUseCase } from './use-cases/get-panel-context.use-case';
import { UpdateProfileUseCase } from './use-cases/update-profile.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([User, Address, Unit]), UnitsModule, EmailModule],
  controllers: [UsersController, UsersUploadController, AddressesController],
  providers: [
    GetUserProfileUseCase,
    GetPanelContextUseCase,
    UpdateProfileUseCase,
    CreateAddressUseCase,
    UpdateAddressUseCase,
    SetDefaultAddressUseCase,
    ListAddressesUseCase,
    GetAddressUseCase,
    DeleteAddressUseCase,
  ],
  exports: [TypeOrmModule],
})
export class UsersModule {}
