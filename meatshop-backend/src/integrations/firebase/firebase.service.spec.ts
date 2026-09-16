import { ConfigService } from '@nestjs/config';
import { deleteApp } from 'firebase-admin/app';
import { FirebaseService } from './firebase.service';

describe('FirebaseService', () => {
  it('initializes token verification from the project id in development', async () => {
    const service = new FirebaseService(
      new ConfigService({
        NODE_ENV: 'development',
        FIREBASE_PROJECT_ID: 'meatshop-local-test',
      }),
    );

    const app = service.getApp();
    expect(app.options.projectId).toBe('meatshop-local-test');
    await deleteApp(app);
  });
});
