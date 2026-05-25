import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrivacyMemoryController } from './privacy-memory.controller';
import { PrismaPrivacyMemoryRepository } from './prisma-privacy-memory.repository';
import { PrivacyMemoryService } from './privacy-memory.service';
import { PRIVACY_MEMORY_REPOSITORY } from './privacy-memory.tokens';

@Module({
  imports: [PrismaModule],
  controllers: [PrivacyMemoryController],
  providers: [
    PrivacyMemoryService,
    {
      provide: PRIVACY_MEMORY_REPOSITORY,
      useClass: PrismaPrivacyMemoryRepository,
    },
  ],
  exports: [PrivacyMemoryService],
})
export class PrivacyMemoryModule {}
