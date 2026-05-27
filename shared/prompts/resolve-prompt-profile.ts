/** server/.env AI_LLM_PROMPT_PROFILE */
export type LlmPromptProfileSetting = 'extension' | 'openwebui' | 'auto';

export type ResolvedLlmPromptProfile = 'extension' | 'openwebui';

/**
 * - extension: 항상 전체 SNS 분석 JSON 프롬프트
 * - openwebui: 이미지 Open WebUI 스타일 (텍스트만이면 extension으로 폴백)
 * - auto(기본): vision 첨부 시 openwebui, 아니면 extension
 */
export function resolveLlmPromptProfile(
  setting: string | undefined,
  visionAttached: boolean,
): ResolvedLlmPromptProfile {
  const raw = (setting ?? 'auto').trim().toLowerCase();
  if (raw === 'extension') return 'extension';
  if (raw === 'openwebui' || raw === 'open-webui' || raw === 'open_webui') {
    return visionAttached ? 'openwebui' : 'extension';
  }
  return visionAttached ? 'openwebui' : 'extension';
}
