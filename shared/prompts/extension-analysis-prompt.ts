/**
 * SafeToUpload 확장 프로그램용 전체 분석 프롬프트 (텍스트 PII + imageRisks + rewrite + 스코어링 필드).
 */
import { ANALYSIS_JSON_SCHEMA_BLOCK } from '../analysis-prompt-schema';
import { REWRITE_SUGGESTION_RULES } from './rewrite-suggestion-rules';

export interface ExtensionAnalysisPromptInput {
  platform: string;
  inputText?: string;
  imagePath?: string;
  /** true면 요청에 이미지 픽셀이 포함됨 (멀티모달) */
  visionAttached?: boolean;
}

export function buildExtensionAnalysisPrompt(input: ExtensionAnalysisPromptInput): string {
  const hasImageMeta = Boolean(input.imagePath?.trim());
  const vision = Boolean(input.visionAttached);

  const imageSection = vision
    ? `
업로드된 이미지가 이 메시지에 첨부되어 있습니다. 픽셀을 직접 보고 imageRisks를 작성하세요.
파일명(참고): ${input.imagePath}
imageRisks: 보이는 민감 요소마다 항목 1개. type·label은 실제로 보이는 것을 자유롭게 명명하세요(고정 목록 아님).
bbox 필수(0~1). 이미지에 없는 항목은 넣지 마세요.
`
    : hasImageMeta
      ? `
첨부 이미지 파일명만 전달됨: ${input.imagePath}
(이미지 픽셀은 전송되지 않았습니다. 텍스트·파일명 맥락으로 추정하거나, 확실하지 않으면 imageRisks: [].)
`
      : `
imageRisks는 이미지가 없으면 빈 배열 []입니다.
`;

  return `당신은 SNS 게시 전 개인정보 점검 AI입니다. 아래 게시글을 분석하고 반드시 JSON만 출력하세요.
${imageSection}
플랫폼: ${input.platform}
게시글:
"""
${input.inputText?.trim() || '(빈 텍스트)'}
"""

${REWRITE_SUGGESTION_RULES}

${ANALYSIS_JSON_SCHEMA_BLOCK}`;
}
