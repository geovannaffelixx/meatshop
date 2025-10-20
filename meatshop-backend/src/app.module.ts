import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Entidades
import { User } from './entities/user.entity';
import { Order } from './entities/order.entity';
import { Expense } from './entities/expense.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PgUser } from './entities/pg-user.entity';

// Controllers
import { AuthController } from './auth/auth.controller';
import { UsersController } from './users.controller';
import { DashboardController } from './dashboard.controller';

// Módulos
import { LoggerModule } from './common/logger/logger.module';
import { MetricsModule } from './metrics/metrics.module';
import { FinanceModule } from './finance/finance.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    MetricsModule,

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = (config.get<string>('DB_TYPE') as 'postgres' | 'sqlite') || 'sqlite';

        return {
          type: dbType,
          host: config.get<string>('DB_HOST'),
          port: Number(config.get<string>('DB_PORT') || 5432),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database:
            dbType === 'postgres'
              ? config.get<string>('DB_DATABASE')
              : config.get<string>('DB_PATH') || 'data/meatshop.db',
          entities: [User, PgUser, Order, Expense, RefreshToken],

          autoLoadEntities: true,
          synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
          logging: config.get<string>('NODE_ENV') !== 'production',
        };
      },
    }),

    TypeOrmModule.forFeature([User, Order]),
    FinanceModule,
    AuthModule,
  ],
  controllers: [AppController, AuthController, UsersController, DashboardController],
  providers: [AppService],
})
export class AppModule {}
