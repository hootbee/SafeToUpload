import { REWRITE_SUGGESTION_RULES } from './rewrite-suggestion-rules';

export interface RewriteOnlyPromptInput {
  platform: string;
  originalText?: string;
  draftRewrite?: string;
}

export function buildRewriteOnlyPrompt(input: RewriteOnlyPromptInput): string {
  const original = input.originalText?.trim() || '(빈 텍스트)';
  const draft = input.draftRewrite?.trim() || '(초안 없음)';

  return `당신은 SNS 게시글 리라이트 전용 AI입니다.
아래 원문을, 개인정보를 최소화하되 내용·맥락·어투를 최대한 유지해 다듬어 주세요.

플랫폼: ${input.platform}
원문:
"""
${original}
"""

1차 수정 초안(참고):
"""
${draft}
"""

${REWRITE_SUGGESTION_RULES}

출력 규칙:
- 반드시 JSON만 출력
- 아래 스키마를 정확히 따르세요
{
  "rewriteSuggestion": ""
}`;
}
