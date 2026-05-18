import { Body, Controller, Post } from '@nestjs/common';
import { AiAnalysisRequestDto } from './dto/ai-analysis-request.dto';
import { AiProxyService } from './ai-proxy.service';

@Controller('ai-proxy')
export class AiProxyController {
  constructor(private readonly aiProxyService: AiProxyService) {}

  @Post('mock')
  mock(@Body() dto: AiAnalysisRequestDto) {
    return this.aiProxyService.mockAnalyze(dto);
  }
}
