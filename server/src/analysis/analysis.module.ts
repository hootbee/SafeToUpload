import { Module } from '@nestjs/common';
import { AiProxyModule } from '../ai-proxy/ai-proxy.module';
import { PrivacyMemoryModule } from '../privacy-memory/privacy-memory.module';
import { SettingsModule } from '../settings/settings.module';
import { StorageModule } from '../storage/storage.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [AiProxyModule, StorageModule, PrivacyMemoryModule, SettingsModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
