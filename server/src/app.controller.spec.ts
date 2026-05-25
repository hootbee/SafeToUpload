import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiProxyService } from './ai-proxy/ai-proxy.service';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: () => 'development-server',
          },
        },
        {
          provide: AiProxyService,
          useValue: {
            resolveLlmTimeoutMs: () => 600_000,
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should return health payload', () => {
    const health = appController.health();
    expect(health.status).toBe('ok');
    expect(health.server).toBe('privacy-check-backend');
  });
});
