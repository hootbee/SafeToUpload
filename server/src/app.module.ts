import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiProxyModule } from './ai-proxy/ai-proxy.module';
import { AnalysisModule } from './analysis/analysis.module';
import { HistoryModule } from './history/history.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrivacyMemoryModule } from './privacy-memory/privacy-memory.module';
import { SettingsModule } from './settings/settings.module';
import { StorageModule } from './storage/storage.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AiProxyModule,
    AnalysisModule,
    HistoryModule,
    SettingsModule,
    PrivacyMemoryModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
