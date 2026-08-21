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

@Module({
  imports: [TypeOrmModule.forFeature([User, Address])],
  controllers: [UsersController, UsersUploadController, AddressesController],
  providers: [
    GetUserProfileUseCase,
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
