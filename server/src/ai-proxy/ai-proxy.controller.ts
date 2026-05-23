import { Body, Controller, Post } from '@nestjs/common';
import { InferenceMode } from '../common/enums/inference-mode.enum';
import { AiAnalysisRequestDto } from './dto/ai-analysis-request.dto';
import { AiProxyService } from './ai-proxy.service';

@Controller('ai-proxy')
export class AiProxyController {
  constructor(private readonly aiProxyService: AiProxyService) {}

  @Post('mock')
  mock(@Body() dto: AiAnalysisRequestDto) {
    return this.aiProxyService.mockAnalyze(dto);
  }

  @Post('analyze')
  analyze(@Body() dto: AiAnalysisRequestDto) {
    return this.aiProxyService.analyze(dto, InferenceMode.SERVER);
  }
}
