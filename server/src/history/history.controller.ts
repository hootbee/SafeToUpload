import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  findAll(@Query() query: { platform?: string; riskLevel?: string; limit?: string; offset?: string }) {
    return this.historyService.findAll(query);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.historyService.remove(id);
  }

  @Delete()
  removeAll() {
    return this.historyService.removeAll();
  }
}
