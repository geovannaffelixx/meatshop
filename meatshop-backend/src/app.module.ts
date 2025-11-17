import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Entidades
import { User } from './entities/user.entity';
import { Order } from './entities/order.entity';
import { Expense } from './entities/expense.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Sale } from './entities/sale.entity';

// Controllers
import { AuthController } from './auth/auth.controller';
import { UsersController } from './users.controller';
import { DashboardController } from './dashboard.controller';
import { UsersUploadController } from './users-upload.controller';
import { OrdersController } from './orders.controller';
import { SalesController } from './sales.controller';

// Módulos
import { LoggerModule } from './common/logger/logger.module';
import { MetricsModule } from './metrics/metrics.module';
import { FinanceModule } from './finance/finance.module';
import { AuthModule } from './auth/auth.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    MetricsModule,

    // Servir arquivos estáticos (uploads)
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'uploads', 'avatars'),
      serveRoot: '/uploads',
    }),

    // Configuração do banco de dados (Postgres/SQLite)
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
          entities: [User, Order, Expense, RefreshToken, Sale], // ✅ Incluído Sale
          autoLoadEntities: true,
          synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
          logging: config.get<string>('NODE_ENV') !== 'production',
        };
      },
    }),

    // Repositórios disponíveis para injeção
    TypeOrmModule.forFeature([User, Order, Expense, Sale]),

    // Outros módulos
    FinanceModule,
    AuthModule,
    SeedModule,
  ],
  controllers: [
    AppController,
    AuthController,
    UsersController,
    DashboardController,
    UsersUploadController,
    OrdersController,
    SalesController,
  ],
  providers: [AppService],
})
export class AppModule {}
