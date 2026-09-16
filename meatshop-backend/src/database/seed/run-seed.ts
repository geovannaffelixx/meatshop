import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';

async function run(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run the development seed in production');
  }
  process.env.SEED_ENABLED = 'true';
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error'],
  });
  await app.close();
}

void run();
