import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Entidades
import { User } from './entities/user.entity';
import { Order } from './entities/order.entity';
import { Expense } from './entities/expense.entity';

// Controllers
import { AuthController } from './auth/auth.controller';
import { UsersController } from './users.controller';
import { DashboardController } from './dashboard.controller';

// Módulos
import { MetricsModule } from './metrics/metrics.module';
import { FinanceModule } from './finance/finance.module';
@Module({
  imports: [
    MetricsModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data/meatshop.db',
      entities: [User, Order, Expense],
      synchronize: true, 
    }),
    TypeOrmModule.forFeature([User, Order]),
    FinanceModule,
  ],
  controllers: [AppController, AuthController, UsersController, DashboardController],
  providers: [AppService],
})
export class AppModule {}
