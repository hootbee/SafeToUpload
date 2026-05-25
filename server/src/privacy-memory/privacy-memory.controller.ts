import { Controller, Delete, Get } from '@nestjs/common';
import { PrivacyMemoryService } from './privacy-memory.service';

@Controller('privacy-memory')
export class PrivacyMemoryController {
  constructor(private readonly privacyMemoryService: PrivacyMemoryService) {}

  @Get()
  list() {
    return this.privacyMemoryService.listSummaries();
  }

  @Delete()
  async deleteAll() {
    const deletedCount = await this.privacyMemoryService.deleteAll();
    return { message: 'Privacy memory deleted', deletedCount };
  }
}
