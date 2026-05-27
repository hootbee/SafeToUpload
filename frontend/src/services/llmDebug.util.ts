const RAW_PREVIEW_MAX = 12_000;

export interface LlmDebugMeta {
  llmRawPreview?: string;
  parseNote?: string;
}

/** 리포트·탐지 내역용 — rawAiResponse / 로컬 raw 문자열 */
export function extractLlmDebugMeta(
  rawAiResponse?: Record<string, unknown>,
  fallbackRaw?: string,
): LlmDebugMeta {
  const rawContent =
    (typeof rawAiResponse?.rawContent === 'string' && rawAiResponse.rawContent) ||
    (typeof fallbackRaw === 'string' && fallbackRaw) ||
    '';

  const preview = rawContent ? rawContent.slice(0, RAW_PREVIEW_MAX) : undefined;
  const notes: string[] = [];

  const mode = String(rawAiResponse?.mode ?? 'unknown');
  notes.push(`mode=${mode}`);

  if (rawAiResponse?.jsonParseOk === false) {
    notes.push('JSON 파싱 실패 (rewriteSuggestion만 복구했을 수 있음)');
  } else if (rawAiResponse?.jsonParseOk === true) {
    notes.push('JSON 파싱 성공');
  }

  const count = rawAiResponse?.imageRisksCount;
  if (typeof count === 'number') {
    notes.push(`imageRisks ${count}건`);
  }

  if (rawAiResponse?.visionAttached === true) {
    notes.push('서버: 이미지 픽셀 전송됨');
  } else if (rawAiResponse?.visionAttached === false && rawAiResponse?.mode === 'server') {
    notes.push('서버: 이미지 미전송(파일명만)');
  }

  if (typeof rawAiResponse?.model === 'string') {
    notes.push(`model=${rawAiResponse.model}`);
  }

  return {
    llmRawPreview: preview,
    parseNote: notes.join(' · '),
  };
}
