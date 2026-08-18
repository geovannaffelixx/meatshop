import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Entidades
import { User } from './users/entities/user.entity';
import { Order } from './orders/entities/order.entity';
import { Expense } from './finance/entities/expense.entity';
import { RefreshTokenEntity } from './auth/entities/refresh-token.entity';
import { Sale } from './finance/entities/sale.entity';
import { Product } from './products/entities/product.entity';
import { Stock } from './products/entities/stock.entity';
import { Category } from './categories/entities/category.entity';
import { Address } from './users/entities/address.entity';
import { Cart } from './cart/entities/cart.entity';
import { CartItem } from './cart/entities/cart-item.entity';
import { Promotion } from './promotions/entities/promotion.entity';
import { Coupon } from './promotions/entities/coupon.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { Payment } from './orders/entities/payment.entity';
import { OrderStatusHistory } from './orders/entities/order-status-history.entity';
import { DeliveryPerson } from './delivery/entities/delivery-person.entity';
import { Vehicle } from './delivery/entities/vehicle.entity';
import { DeliveryTracking } from './delivery/entities/delivery-tracking.entity';
import { Review } from './reviews/entities/review.entity';
import { DeliveryReview } from './reviews/entities/delivery-review.entity';
import { SupportTicket } from './support/entities/support-ticket.entity';
import { AuditLog } from './audit/entities/audit-log.entity';
import { Recipe } from './recipes/entities/recipe.entity';
import { RecipeStep } from './recipes/entities/recipe-step.entity';
import { RecipeIngredient } from './recipes/entities/recipe-ingredient.entity';
import { RecipeProduct } from './recipes/entities/recipe-product.entity';
import { SavedPaymentMethod } from './saved-payment-methods/entities/saved-payment-method.entity';
import { Unit } from './units/entities/unit.entity';
import { UserUnit } from './units/entities/user-unit.entity';

// Controllers
import { DashboardController } from './dashboard/dashboard.controller';
import { SalesController } from './finance/sales.controller';

// Módulos
import { LoggerModule } from './common/logger/logger.module';
import { MetricsModule } from './metrics/metrics.module';
import { FinanceModule } from './finance/finance.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UnitsModule } from './units/units.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { PromotionsModule } from './promotions/promotions.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveryModule } from './delivery/delivery.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SupportModule } from './support/support.module';
import { AuditModule } from './audit/audit.module';
import { RecipesModule } from './recipes/recipes.module';
import { SavedPaymentMethodsModule } from './saved-payment-methods/saved-payment-methods.module';
import { SeedModule } from './database/seed/seed.module';
import { MercadoPagoModule } from '@/mercadopago/mercadopago.module';
import { EmailModule } from './email/email.module';
@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    MetricsModule,

    EmailModule,

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
          entities: [
            User,
            Order,
            Expense,
            RefreshTokenEntity,
            Sale,
            Product,
            Stock,
            Category,
            Address,
            Cart,
            CartItem,
            Promotion,
            Coupon,
            OrderItem,
            Payment,
            OrderStatusHistory,
            DeliveryPerson,
            Vehicle,
            DeliveryTracking,
            Review,
            DeliveryReview,
            SupportTicket,
            AuditLog,
            Recipe,
            RecipeStep,
            RecipeIngredient,
            RecipeProduct,
            SavedPaymentMethod,
            Unit,
            UserUnit,
          ],
          autoLoadEntities: true,
          synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
          logging: config.get<string>('NODE_ENV') !== 'production',
        };
      },
    }),

    // Repositórios disponíveis para injeção
    TypeOrmModule.forFeature([Order, Expense, Sale]),

    // Outros módulos
    FinanceModule,
    AuthModule,
    UsersModule,
    UnitsModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    PromotionsModule,
    OrdersModule,
    DeliveryModule,
    ReviewsModule,
    SupportModule,
    AuditModule,
    RecipesModule,
    SavedPaymentMethodsModule,
    SeedModule,
    MercadoPagoModule,
  ],
  controllers: [
    AppController,
    DashboardController,
    SalesController,
  ],
  providers: [AppService],
})
export class AppModule { }
