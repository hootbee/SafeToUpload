import { RiskLevel } from '../../common/enums/risk-level.enum';
import type { AiAnalysisResponse } from '../types/ai-analysis-response.type';

const PHONE_REGEX = /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const DEFAULT_REWRITE_HINT = '개인 연락처·주소·일정 등 식별 가능한 정보를 제거한 뒤 게시하세요.';

type PartialAi = Partial<AiAnalysisResponse> & Record<string, unknown>;

function isPlaceholderRewrite(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t === DEFAULT_REWRITE_HINT) return true;
  if (t.length < 100 && /(제거한 뒤 게시|식별 가능한 정보|권장합니다|작성하세요)/.test(t)) {
    return true;
  }
  return false;
}

function polishRewriteForUpload(text: string): string {
  let out = text.replace(/\[[^\]]*\]/g, '');
  out = out.replace(/:\s*(?=[,.]|$)/g, '');
  out = out.replace(/,\s*,+/g, ', ');
  out = out.replace(/\.{2,}/g, '.');
  out = out.replace(/\s+(이고|고)\s*\./g, '이에요.');
  out = out.replace(/\s+고\s*,/g, '고,');
  out = out.replace(/\s{2,}/g, ' ');
  out = out.replace(/(DM으로\s*){2,}/gi, 'DM으로 ');
  out = out.replace(/^\s*[,.]\s*/gm, '');
  return out.trim();
}

function isDamagedRewrite(original: string, rewritten: string): boolean {
  const o = original.trim();
  const r = rewritten.trim();
  if (!o || !r) return true;
  if (r.length < o.length * 0.6) return true;
  if (/DM으로.*DM으로/i.test(r)) return true;
  if (/올리지 않을게요|비공개로 둘게요|개인 정보는/.test(r) && !/올리지 않을게요|비공개로 둘게요/.test(o)) {
    return true;
  }
  return false;
}

function heuristicRewriteText(text: string): string {
  if (!text.trim()) return text;
  let out = text;
  out = out.replace(
    /연락은\s*01[016789][-\s]?\d{3,4}[-\s]?\d{4}\s*로\s*주세요/gi,
    '연락은 DM으로 주세요',
  );
  out = out.replace(PHONE_REGEX, '연락처 비공개');
  out = out.replace(/메일은\s*\S+@\S+\s*입니다/gi, '메일은 DM으로 주세요');
  out = out.replace(EMAIL_REGEX, '이메일 비공개');
  out = out.replace(/(\d{1,4})동\s*(\d{1,4})호/g, '동·호 비공개');
  out = out.replace(/([가-힣A-Za-z0-9]+로)\s*\d+,\s*\d+층/g, '$1 사무실');
  out = out.replace(/제\s*이름\s*[가-힣]{2,4}\s*\/\s*생년\s*\d{6}/gi, '이름·생년 정보');
  out = out.replace(/생년\s*\d{6}/g, '생년 정보');
  out = out.replace(/\d{2,3}[가-힣]\s?\d{4}/g, '차량번호 비공개');
  out = out.replace(/\*[\d#]+\*?/g, '비밀번호 비공개');
  out = out.replace(/비밀번호는\s*[^\s,)]+/gi, '비밀번호는 비공개');
  out = out.replace(/주소:\s*[^,\n]+/g, '주소: 상세 주소 비공개');
  out = out.replace(/주민번호[^\n,.]*/g, '주민번호 비공개');
  return polishRewriteForUpload(out);
}

export function heuristicPiiScan(text: string): AiAnalysisResponse['piiItems'] {
  const items: AiAnalysisResponse['piiItems'] = [];
  const phones = text.match(PHONE_REGEX) ?? [];
  phones.forEach((phone, index) => {
    items.push({
      type: 'phone',
      label: '전화번호',
      text: phone,
      severity: 'high',
      description: `휴대폰 번호 형식 후보 #${index + 1}`,
      location: '본문',
      policyRef: '개인 연락처 비공개 권장',
    });
  });
  const emails = text.match(EMAIL_REGEX) ?? [];
  emails.forEach((email, index) => {
    items.push({
      type: 'email',
      label: '이메일',
      text: email,
      severity: 'medium',
      description: `이메일 후보 #${index + 1}`,
      location: '본문',
      policyRef: '개인 식별 정보 최소화',
    });
  });
  return items;
}

export function parseModelJsonOutput(raw: string): PartialAi | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as PartialAi;
  } catch {
    const rewriteMatch = candidate.match(/"rewriteSuggestion"\s*:\s*"((?:\\.|[^"\\])*)"/);
    if (!rewriteMatch) return null;
    try {
      const rewriteSuggestion = JSON.parse(`"${rewriteMatch[1]}"`) as string;
      return { rewriteSuggestion };
    } catch {
      return null;
    }
  }
}

function resolveRewriteSuggestion(partial: PartialAi, originalText: string): string {
  const fromContext =
    partial.contextResult && typeof partial.contextResult === 'object'
      ? String((partial.contextResult as Record<string, unknown>).rewriteSuggestion ?? '')
      : '';

  const candidates = [
    partial.rewriteSuggestion,
    partial.rewrittenText,
    partial.safeText,
    fromContext,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim() && !isPlaceholderRewrite(value)) {
      const polished = polishRewriteForUpload(value.trim());
      if (!isDamagedRewrite(originalText, polished)) {
        return polished;
      }
    }
  }

  const heuristic = polishRewriteForUpload(heuristicRewriteText(originalText));
  if (heuristic && heuristic !== originalText && !isPlaceholderRewrite(heuristic)) {
    return heuristic;
  }

  return heuristic || DEFAULT_REWRITE_HINT;
}

function estimateScore(items: AiAnalysisResponse['piiItems']) {
  if (items.length >= 3) return 82;
  if (items.length === 2) return 68;
  if (items.length === 1) return 48;
  return 22;
}

function clampScore(score: number) {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeRiskLevel(level: unknown, score: number): RiskLevel {
  if (typeof level === 'string' && Object.values(RiskLevel).includes(level as RiskLevel)) {
    return level as RiskLevel;
  }
  if (score >= 80) return RiskLevel.CRITICAL;
  if (score >= 60) return RiskLevel.HIGH;
  if (score >= 35) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

export function normalizeServerAiResponse(
  partial: PartialAi,
  inputText: string,
  meta: { model: string; chatUrl: string },
): AiAnalysisResponse {
  const text = inputText ?? '';
  const piiItems =
    Array.isArray(partial.piiItems) && partial.piiItems.length > 0
      ? partial.piiItems
      : heuristicPiiScan(text);

  const riskScore = clampScore(Number(partial.riskScore ?? estimateScore(piiItems)));
  const riskLevel = normalizeRiskLevel(partial.riskLevel, riskScore);

  return {
    riskScore,
    riskLevel,
    piiItems,
    exifItems: Array.isArray(partial.exifItems) ? partial.exifItems : [],
    imageRisks: Array.isArray(partial.imageRisks) ? partial.imageRisks : [],
    contextResult:
      partial.contextResult && typeof partial.contextResult === 'object'
        ? partial.contextResult
        : { summary: '문맥 분석 결과가 없습니다.' },
    rewriteSuggestion: resolveRewriteSuggestion(partial, text),
    rawAiResponse: {
      ...(partial.rawAiResponse && typeof partial.rawAiResponse === 'object' ? partial.rawAiResponse : {}),
      mode: 'server-chat-completions',
      model: meta.model,
      chatUrl: meta.chatUrl,
    },
  };
}

export function extractChatCompletionContent(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    throw new Error('LLM 응답이 비어 있습니다.');
  }
  const body = payload as Record<string, unknown>;
  const choices = body.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('LLM 응답에 choices가 없습니다.');
  }
  const first = choices[0] as Record<string, unknown>;
  const message = first.message as Record<string, unknown> | undefined;
  const content = message?.content;
  if (typeof content === 'string' && content.trim()) {
    return content;
  }
  if (Array.isArray(content)) {
    const textPart = content.find(
      (part) => part && typeof part === 'object' && (part as { type?: string }).type === 'text',
    ) as { text?: string } | undefined;
    if (textPart?.text?.trim()) return textPart.text;
  }
  const text = first.text;
  if (typeof text === 'string' && text.trim()) return text;
  throw new Error('LLM 응답에서 assistant content를 찾을 수 없습니다.');
}
