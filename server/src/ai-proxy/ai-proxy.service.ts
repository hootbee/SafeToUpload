import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InferenceMode } from '../common/enums/inference-mode.enum';
import { RiskLevel } from '../common/enums/risk-level.enum';
import { AiAnalysisRequestDto } from './dto/ai-analysis-request.dto';
import { AiAnalysisResponse } from './types/ai-analysis-response.type';

@Injectable()
export class AiProxyService {
  private readonly logger = new Logger(AiProxyService.name);

  constructor(private readonly configService: ConfigService) {}

  async analyze(input: AiAnalysisRequestDto, mode: InferenceMode = InferenceMode.SERVER): Promise<AiAnalysisResponse> {
    if (mode === InferenceMode.LOCAL) {
      throw new ServiceUnavailableException('Local inference runs in the browser extension, not on the API server.');
    }

    const useMockFallback = this.configService.get<string>('AI_USE_MOCK_FALLBACK', 'false') === 'true';

    try {
      return await this.requestExternalAiServer(input);
    } catch (error) {
      this.logger.warn(`External AI request failed: ${(error as Error).message}`);
      if (useMockFallback) {
        return this.mockAnalyze(input, { fallback: true, reason: (error as Error).message });
      }
      throw error;
    }
  }

  mockAnalyze(
    input: AiAnalysisRequestDto,
    meta: { fallback?: boolean; reason?: string } = {},
  ): AiAnalysisResponse {
    const hasText = Boolean(input.inputText && input.inputText.length > 0);
    return {
      riskScore: hasText ? 76 : 42,
      riskLevel: hasText ? RiskLevel.HIGH : RiskLevel.MEDIUM,
      piiItems: [
        {
          type: 'address',
          label: '주소',
          text: '전주시 ...',
          severity: 'high',
          startIndex: 4,
          endIndex: 12,
        },
        {
          type: 'phone',
          label: '전화번호',
          text: '010-0000-0000',
          severity: 'high',
        },
      ],
      exifItems: [
        {
          type: 'gps',
          label: '위치 메타데이터',
          severity: 'medium',
          description: '이미지에 위치 정보가 포함될 수 있습니다.',
        },
      ],
      imageRisks: [{ type: 'face', label: '얼굴 노출', severity: 'medium' }],
      contextResult: {
        summary: '게시글 문맥상 거주지와 연락처가 함께 노출될 가능성이 있습니다.',
        platformContext: 'SNS 게시글',
      },
      rewriteSuggestion: '개인 주소와 전화번호를 제거한 뒤 게시하는 것이 안전합니다.',
      rawAiResponse: {
        mode: meta.fallback ? 'mock-fallback' : 'mock',
        model: this.configService.get<string>('AI_SERVER_MODEL', 'gemma-4-26b'),
        aiServerUrl: this.configService.get<string>('AI_SERVER_URL', ''),
        fallbackReason: meta.reason,
      },
    };
  }

  async requestExternalAiServer(input: AiAnalysisRequestDto): Promise<AiAnalysisResponse> {
    const aiServerUrl = this.configService.get<string>('AI_SERVER_URL', 'http://localhost:8000').replace(/\/$/, '');
    const model = this.configService.get<string>('AI_SERVER_MODEL', 'gemma-4-26b');
    const timeoutMs = Number(this.configService.get<string>('AI_SERVER_TIMEOUT_MS', '120000'));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${aiServerUrl}/v1/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          sourceType: input.sourceType,
          platform: input.platform,
          inputText: input.inputText,
          pageUrl: input.pageUrl,
          imagePath: input.imagePath,
          inferenceMode: InferenceMode.SERVER,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new ServiceUnavailableException(
          `AI server responded with ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
        );
      }

      const payload = (await response.json()) as Partial<AiAnalysisResponse>;
      return this.normalizeAiResponse(payload, { model, aiServerUrl });
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeAiResponse(
    payload: Partial<AiAnalysisResponse>,
    meta: { model: string; aiServerUrl: string },
  ): AiAnalysisResponse {
    const riskScore = Number(payload.riskScore ?? 0);
    const riskLevel = this.normalizeRiskLevel(payload.riskLevel, riskScore);

    return {
      riskScore,
      riskLevel,
      piiItems: Array.isArray(payload.piiItems) ? payload.piiItems : [],
      exifItems: Array.isArray(payload.exifItems) ? payload.exifItems : [],
      imageRisks: Array.isArray(payload.imageRisks) ? payload.imageRisks : [],
      contextResult:
        payload.contextResult && typeof payload.contextResult === 'object' ? payload.contextResult : { summary: '' },
      rewriteSuggestion: String(payload.rewriteSuggestion ?? ''),
      rawAiResponse: {
        ...(payload.rawAiResponse && typeof payload.rawAiResponse === 'object' ? payload.rawAiResponse : {}),
        mode: 'server',
        model: meta.model,
        aiServerUrl: meta.aiServerUrl,
      },
    };
  }

  private normalizeRiskLevel(level: unknown, riskScore: number): RiskLevel {
    if (typeof level === 'string' && Object.values(RiskLevel).includes(level as RiskLevel)) {
      return level as RiskLevel;
    }
    if (riskScore >= 80) return RiskLevel.CRITICAL;
    if (riskScore >= 60) return RiskLevel.HIGH;
    if (riskScore >= 35) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }
}
