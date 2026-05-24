import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { RunAnalysisDto } from './dto/run-analysis.dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  create(@Body() dto: CreateAnalysisDto) {
    return this.analysisService.create(dto);
  }

  @Post(':id/run')
  run(@Param('id') id: string, @Body() dto: RunAnalysisDto) {
    return this.analysisService.run(id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.analysisService.findOne(id);
  }

  @Get(':id/status')
  findStatus(@Param('id') id: string) {
    return this.analysisService.findStatus(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.analysisService.cancel(id);
  }
}
