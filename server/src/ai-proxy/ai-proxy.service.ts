import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InferenceMode } from '../common/enums/inference-mode.enum';
import { LlmConfigDto } from './dto/llm-config.dto';
import { AiAnalysisRequestDto } from './dto/ai-analysis-request.dto';
import { buildServerAnalysisPrompt } from './utils/analysis-prompt.util';
import {
  extractChatCompletionContent,
  normalizeServerAiResponse,
  parseModelJsonOutput,
} from './utils/server-ai-normalize.util';
import { AiAnalysisResponse } from './types/ai-analysis-response.type';

export interface ResolvedLlmConfig {
  chatUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULT_LLM_TIMEOUT_MS = 600_000;
/** 예전 기본값 — 26B 원격 추론에는 부족해 자동 상향 */
const LEGACY_SHORT_TIMEOUT_MS = 120_000;

@Injectable()
export class AiProxyService implements OnModuleInit {
  private readonly logger = new Logger(AiProxyService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const timeoutMs = this.resolveLlmTimeoutMs();
    this.logger.log(
      `LLM timeout: ${timeoutMs}ms (${Math.round(timeoutMs / 60000)}분) — AI_LLM_TIMEOUT_MS=${this.configService.get('AI_LLM_TIMEOUT_MS') ?? '(unset)'}, AI_SERVER_TIMEOUT_MS=${this.configService.get('AI_SERVER_TIMEOUT_MS') ?? '(unset)'}`,
    );
  }

  /** 대형 모델(26B 등) 원격 추론용 — 기본 10분 */
  resolveLlmTimeoutMs(): number {
    const fromLlm = Number(this.configService.get<string>('AI_LLM_TIMEOUT_MS', ''));
    if (Number.isFinite(fromLlm) && fromLlm > 0) {
      return fromLlm <= LEGACY_SHORT_TIMEOUT_MS ? DEFAULT_LLM_TIMEOUT_MS : fromLlm;
    }

    const legacy = Number(
      this.configService.get<string>('AI_SERVER_TIMEOUT_MS', String(DEFAULT_LLM_TIMEOUT_MS)),
    );
    if (!Number.isFinite(legacy) || legacy <= 0) return DEFAULT_LLM_TIMEOUT_MS;
    if (legacy <= LEGACY_SHORT_TIMEOUT_MS) return DEFAULT_LLM_TIMEOUT_MS;
    return legacy;
  }

  resolveLlmConfig(override?: LlmConfigDto): ResolvedLlmConfig {
    const chatUrl = (
      override?.chatUrl?.trim() ||
      this.configService.get<string>('AI_LLM_CHAT_URL', '') ||
      this.configService.get<string>('AI_SERVER_URL', '')
    ).replace(/\/$/, '');

    const normalizedUrl = chatUrl.includes('/api/chat/completions')
      ? chatUrl
      : chatUrl
        ? `${chatUrl}/api/chat/completions`
        : '';

    return {
      chatUrl: normalizedUrl,
      apiKey: (
        override?.apiKey?.trim() ||
        this.configService.get<string>('AI_LLM_API_KEY', '') ||
        ''
      ).trim(),
      model:
        override?.model?.trim() ||
        this.configService.get<string>('AI_LLM_MODEL', '') ||
        this.configService.get<string>('AI_SERVER_MODEL', 'gemma4:26b'),
    };
  }

  async analyze(
    input: AiAnalysisRequestDto,
    mode: InferenceMode = InferenceMode.SERVER,
    llmOverride?: LlmConfigDto,
  ): Promise<AiAnalysisResponse> {
    if (mode === InferenceMode.LOCAL) {
      throw new ServiceUnavailableException('Local inference runs in the browser extension, not on the API server.');
    }

    const useMockFallback = this.configService.get<string>('AI_USE_MOCK_FALLBACK', 'false') === 'true';

    try {
      return await this.requestChatCompletions(input, llmOverride);
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
    const llm = this.resolveLlmConfig();
    const partial = {
      categoryScores: hasText
        ? { pii: 75, exif: 55, image: 50, context: 60 }
        : { pii: 20, exif: 10, image: 15, context: 25 },
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
        model: llm.model,
        chatUrl: llm.chatUrl,
        fallbackReason: meta.reason,
      },
    };
    return normalizeServerAiResponse(partial, input.inputText ?? '', {
      model: llm.model,
      chatUrl: llm.chatUrl,
      platform: input.platform,
    });
  }

  async requestChatCompletions(
    input: AiAnalysisRequestDto,
    llmOverride?: LlmConfigDto,
  ): Promise<AiAnalysisResponse> {
    const llm = this.resolveLlmConfig(llmOverride);
    if (!llm.chatUrl) {
      throw new ServiceUnavailableException(
        'LLM Chat URL이 설정되지 않았습니다. server/.env의 AI_LLM_CHAT_URL 또는 확장 프로그램 설정을 확인하세요.',
      );
    }

    const timeoutMs = this.resolveLlmTimeoutMs();
    const maxTokens = Number(this.configService.get<string>('AI_LLM_MAX_TOKENS', '1024'));
    const prompt = buildServerAnalysisPrompt({
      platform: input.platform,
      inputText: input.inputText,
      imagePath: input.imagePath,
    });

    this.logger.log(
      `LLM request: model=${llm.model}, timeoutMs=${timeoutMs}, maxTokens=${maxTokens}`,
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (llm.apiKey) {
      headers.Authorization = `Bearer ${llm.apiKey}`;
    }

    try {
      const response = await fetch(llm.chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: llm.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          max_tokens: Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : 1024,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new ServiceUnavailableException(
          `LLM server responded with ${response.status}${body ? `: ${body.slice(0, 300)}` : ''}`,
        );
      }

      const payload = (await response.json()) as unknown;
      const rawContent = extractChatCompletionContent(payload);
      const parsed = parseModelJsonOutput(rawContent);

      if (!parsed) {
        throw new ServiceUnavailableException(
          'LLM 응답에서 분석 JSON을 파싱하지 못했습니다. 모델이 JSON만 출력하도록 프롬프트를 확인하세요.',
        );
      }

      return normalizeServerAiResponse(parsed, input.inputText ?? '', {
        model: llm.model,
        chatUrl: llm.chatUrl,
        platform: input.platform,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        const minutes = Math.round(timeoutMs / 60000);
        throw new ServiceUnavailableException(
          `LLM 응답이 ${minutes}분(${timeoutMs}ms) 안에 오지 않았습니다. server/.env의 AI_LLM_TIMEOUT_MS를 늘리거나(예: 600000), Open WebUI에서 더 가벼운 모델을 사용하세요.`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

}
