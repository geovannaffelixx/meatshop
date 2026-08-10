import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersUploadController } from './users-upload.controller';
import { GetUserProfileUseCase } from './use-cases/get-user-profile.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController, UsersUploadController],
  providers: [GetUserProfileUseCase],
  exports: [TypeOrmModule],
})
export class UsersModule {}
