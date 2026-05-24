import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProxyService } from './ai-proxy/ai-proxy.service';
import { AppMode } from './common/enums/app-mode.enum';

@Controller()
export class AppController {
  constructor(
    private readonly configService: ConfigService,
    private readonly aiProxyService: AiProxyService,
  ) {}

  @Get('health')
  health() {
    const llmTimeoutMs = this.aiProxyService.resolveLlmTimeoutMs();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: 'privacy-check-backend',
      appMode: this.configService.get<AppMode>('APP_MODE', AppMode.DEVELOPMENT_SERVER),
      llmTimeoutMs,
      llmTimeoutMinutes: Math.round(llmTimeoutMs / 60_000),
    };
  }
}
