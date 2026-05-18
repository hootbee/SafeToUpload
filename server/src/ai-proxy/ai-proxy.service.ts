import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RiskLevel } from '../common/enums/risk-level.enum';
import { AiAnalysisRequestDto } from './dto/ai-analysis-request.dto';
import { AiAnalysisResponse } from './types/ai-analysis-response.type';

@Injectable()
export class AiProxyService {
  constructor(private readonly configService: ConfigService) {}

  mockAnalyze(input: AiAnalysisRequestDto): AiAnalysisResponse {
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
        mode: 'mock',
        aiServerUrl: this.configService.get<string>('AI_SERVER_URL', ''),
      },
    };
  }

  async requestExternalAiServer(_input: AiAnalysisRequestDto): Promise<AiAnalysisResponse> {
    const _aiServerUrl = this.configService.get<string>('AI_SERVER_URL', 'http://localhost:8000');
    // TODO: Integrate external AI server request using AI_SERVER_URL and map response to AiAnalysisResponse.
    throw new Error('External AI server integration is not implemented yet.');
  }
}
