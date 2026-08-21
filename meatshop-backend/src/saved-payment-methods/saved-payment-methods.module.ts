import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { SavedPaymentMethod } from './entities/saved-payment-method.entity';
import { SavedPaymentMethodsController } from './saved-payment-methods.controller';
import { DeletePaymentMethodUseCase } from './use-cases/delete-payment-method.use-case';
import { ListSavedPaymentMethodsUseCase } from './use-cases/list-saved-payment-methods.use-case';
import { SavePaymentMethodUseCase } from './use-cases/save-payment-method.use-case';
import { SetDefaultPaymentMethodUseCase } from './use-cases/set-default-payment-method.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([SavedPaymentMethod]), MercadoPagoModule],
  controllers: [SavedPaymentMethodsController],
  providers: [
    SavePaymentMethodUseCase,
    ListSavedPaymentMethodsUseCase,
    SetDefaultPaymentMethodUseCase,
    DeletePaymentMethodUseCase,
  ],
})
export class SavedPaymentMethodsModule {}
