import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  root() {
    this.logger.log('Endpoint / chamado');
    return this.appService.getInfo();
  }

  @Get('health')
  health() {
    this.logger.log('Endpoint /health chamado');
    return this.appService.getHealth();
  }
}
