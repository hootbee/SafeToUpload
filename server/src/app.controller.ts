import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppMode } from './common/enums/app-mode.enum';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: 'privacy-check-backend',
      appMode: this.configService.get<AppMode>('APP_MODE', AppMode.DEVELOPMENT_SERVER),
    };
  }
}
