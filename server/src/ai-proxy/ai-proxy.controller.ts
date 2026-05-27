import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InferenceMode } from '../common/enums/inference-mode.enum';
import { AiAnalysisRequestDto } from './dto/ai-analysis-request.dto';
import { AiProxyService } from './ai-proxy.service';
import { buildOpenWebUiPromptForCopy } from './utils/analysis-prompt.util';

@Controller('ai-proxy')
export class AiProxyController {
  constructor(private readonly aiProxyService: AiProxyService) {}

  /**
   * Open WebUI 채팅에 붙여 넣을 사용자 메시지 템플릿 (이미지는 UI에서 별도 첨부).
   * GET /ai-proxy/prompts/open-webui?platform=instagram&inputText=...
   */
  @Get('prompts/open-webui')
  openWebUiPrompt(
    @Query('platform') platform = 'unknown',
    @Query('inputText') inputText?: string,
    @Query('imagePath') imagePath?: string,
  ) {
    const prompt = buildOpenWebUiPromptForCopy({
      platform,
      inputText,
      imagePath,
      visionAttached: true,
    });
    return {
      profile: 'openwebui',
      prompt,
      hint: 'Open WebUI에서 이미지를 첨부한 뒤 위 prompt를 사용자 메시지로 붙여 넣으세요. 서버 분석과 동일하려면 AI_LLM_PROMPT_PROFILE=openwebui 또는 auto(기본)를 사용하세요.',
    };
  }

  @Post('mock')
  mock(@Body() dto: AiAnalysisRequestDto) {
    return this.aiProxyService.mockAnalyze(dto);
  }

  @Post('analyze')
  analyze(@Body() dto: AiAnalysisRequestDto) {
    return this.aiProxyService.analyze(dto, InferenceMode.SERVER);
  }
}
