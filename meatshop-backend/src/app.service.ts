import { Injectable } from '@nestjs/common';
import * as pkg from '../package.json';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'meatshop-backend',
      version: (pkg as any).version ?? '0.0.0',
      env: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }

  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  getHello(): string {
    return 'Hello World!';
  }
}
