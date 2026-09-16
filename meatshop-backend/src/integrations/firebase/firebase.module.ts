import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { AppCheckMiddleware } from './app-check.middleware';

@Global()
@Module({
  providers: [FirebaseService, AppCheckMiddleware],
  exports: [FirebaseService, AppCheckMiddleware],
})
export class FirebaseModule {}
