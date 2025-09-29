import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  constructor(private readonly appService: AppService) {}
  @Get() getHello(): string { this.logger.log('Endpoint / chamado'); return this.appService.getHello(); }
  @Get('/health') getHealth() { this.logger.log('Endpoint /health chamado'); return { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }; }
  @Get('/metrics') getMetrics() { this.logger.log('Endpoint /metrics chamado'); return { memoryUsage: process.memoryUsage(), uptime: process.uptime(), cpuUsage: process.cpuUsage(), timestamp: new Date().toISOString() }; }
}
