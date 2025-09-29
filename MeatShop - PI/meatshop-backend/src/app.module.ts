import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity';
import { Order } from './entities/order.entity';
import { AuthController } from './auth/auth.controller';
import { UsersController } from './users.controller';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data/meatshop.db',
      entities: [User, Order],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Order]),
  ],
  controllers: [AppController, AuthController, UsersController, DashboardController],
  providers: [AppService],
})
export class AppModule {}
