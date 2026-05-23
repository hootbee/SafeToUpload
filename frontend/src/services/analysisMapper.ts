import type { AiAnalysisResponse, AiPiiItem } from '../shared/aiTypes';
import type { AnalysisInput, Platform, RiskReportData } from '../shared/types';
import type { DetectionHit } from './imageDetectService';
import { buildDynamicImageRiskSummary, buildMaskRegions } from './imageMaskService';

const PHONE_REGEX = /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const DEFAULT_REWRITE_HINT =
  '개인 연락처·주소·일정 등 식별 가능한 정보를 제거한 뒤 게시하세요.';

/** 모델이 지침만 반환했는지 판별 */
export function isPlaceholderRewrite(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t === DEFAULT_REWRITE_HINT) return true;
  if (t.length < 100 && /(제거한 뒤 게시|식별 가능한 정보|권장합니다|작성하세요)/.test(t)) {
    return true;
  }
  return false;
}

/** 대괄호·깨진 구두점 정리 */
export function polishRewriteForUpload(text: string): string {
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

/** 모델 수정안이 맥락을 과도하게 잘랐는지 */
export function isDamagedRewrite(original: string, rewritten: string): boolean {
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

/**
 * 치명적 PII만 국소 치환 — 문장·맥락·만남 일정은 유지
 */
export function heuristicRewriteText(text: string): string {
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
  out = out.replace(
    /제\s*이름\s*[가-힣]{2,4}\s*\/\s*생년\s*\d{6}/gi,
    '이름·생년 정보',
  );
  out = out.replace(/생년\s*\d{6}/g, '생년 정보');
  out = out.replace(/\d{2,3}[가-힣]\s?\d{4}/g, '차량번호 비공개');
  out = out.replace(/\*[\d#]+\*?/g, '비밀번호 비공개');
  out = out.replace(/비밀번호는\s*[^\s,)]+/gi, '비밀번호는 비공개');
  out = out.replace(
    /주소:\s*[^,\n]+/g,
    '주소: 상세 주소 비공개',
  );
  out = out.replace(/주민번호[^\n,.]*/g, '주민번호 비공개');

  return polishRewriteForUpload(out);
}

function resolveRewriteSuggestion(
  partial: Partial<AiAnalysisResponse> & Record<string, unknown>,
  originalText: string,
): string {
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

export function heuristicPiiScan(text: string): AiPiiItem[] {
  const items: AiPiiItem[] = [];
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

export function parseModelJsonOutput(raw: string): Partial<AiAnalysisResponse> | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Partial<AiAnalysisResponse>;
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

export function normalizeAiResponse(
  partial: Partial<AiAnalysisResponse>,
  input: AnalysisInput,
): AiAnalysisResponse {
  const text = input.text ?? '';
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
    rewriteSuggestion: resolveRewriteSuggestion(
      partial as Partial<AiAnalysisResponse> & Record<string, unknown>,
      text,
    ),
    rawAiResponse: partial.rawAiResponse ?? { mode: 'local' },
  };
}

export function mapAiResponseToReport(
  ai: AiAnalysisResponse,
  input: AnalysisInput,
  detections: DetectionHit[] = [],
): RiskReportData {
  const contextSummary = String(ai.contextResult.summary ?? '컨텍스트 분석 완료');
  const exifSummary =
    ai.exifItems.length > 0
      ? ai.exifItems.map((item) => String(item.label ?? item.type ?? 'EXIF')).join(', ')
      : '이미지 메타데이터 위험 없음';

  const hasImage = Boolean(input.imageFile || input.imageName);
  const maskBuild = buildMaskRegions(ai, hasImage, detections, input.text);
  const imageRiskSummary = hasImage
    ? buildDynamicImageRiskSummary(maskBuild)
    : '이미지 미업로드, 텍스트 중심 분석';

  const keywords = ai.piiItems
    .map((item) => item.text || item.label || item.type)
    .filter(Boolean)
    .slice(0, 6) as string[];

  return {
    score: ai.riskScore,
    piiItems: ai.piiItems.map((item, index) => mapPiiToRiskDetail(item, index)),
    exifSummary,
    imageRiskSummary,
    contextSummary,
    memoryPattern: {
      hasData: keywords.length > 0,
      frequencies: summarizeFrequencies(ai.piiItems),
      keywords,
    },
    originalText: input.text,
    rewrittenText: ai.rewriteSuggestion,
    maskRegions: maskBuild.regions,
    maskCandidateMeta: {
      gemmaCategories: maskBuild.gemmaCategories,
      detectedCategories: maskBuild.detectedCategories,
      unionCategories: maskBuild.unionCategories,
      skippedCategories: maskBuild.skippedCategories,
    },
  };
}

export function mapRecordToReport(record: {
  inputText?: string | null;
  riskScore?: number | null;
  summary?: string | null;
  result?: {
    piiItems?: unknown;
    exifItems?: unknown;
    imageRisks?: unknown;
    contextResult?: unknown;
    rewriteSuggestion?: string | null;
  } | null;
}, platform: Platform, imageName?: string, detections: DetectionHit[] = []): RiskReportData {
  const input: AnalysisInput = { text: record.inputText ?? '', platform, imageName };
  const ai = normalizeAiResponse(
    {
      riskScore: record.riskScore ?? undefined,
      piiItems: (record.result?.piiItems as AiPiiItem[]) ?? [],
      exifItems: (record.result?.exifItems as Array<Record<string, unknown>>) ?? [],
      imageRisks: (record.result?.imageRisks as Array<Record<string, unknown>>) ?? [],
      contextResult: (record.result?.contextResult as Record<string, unknown>) ?? {
        summary: record.summary ?? '',
      },
      rewriteSuggestion: record.result?.rewriteSuggestion ?? '',
    },
    input,
  );
  return mapAiResponseToReport(ai, input, detections);
}

function mapPiiToRiskDetail(item: AiPiiItem, index: number) {
  return {
    id: `pii-${index + 1}`,
    type: item.label || item.type || '개인정보',
    description: item.description || item.text || '탐지된 개인정보 후보',
    location: item.location || '본문',
    policyRef: item.policyRef || '개인정보 최소 공개 원칙',
  };
}

function summarizeFrequencies(items: AiPiiItem[]) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = item.label || item.type || '기타';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
}

function estimateScore(items: AiPiiItem[]) {
  if (items.length >= 3) return 82;
  if (items.length === 2) return 68;
  if (items.length === 1) return 48;
  return 22;
}

function clampScore(score: number) {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeRiskLevel(level: unknown, score: number) {
  if (typeof level === 'string' && ['low', 'medium', 'high', 'critical'].includes(level)) {
    return level as AiAnalysisResponse['riskLevel'];
  }
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function mapHistoryToItem(record: {
  id: string;
  platform: string;
  riskLevel: string | null;
  summary: string | null;
  createdAt: string;
}) {
  return {
    id: record.id,
    date: record.createdAt.slice(0, 10),
    platform: record.platform as Platform,
    riskLevel: (record.riskLevel ?? 'low') as 'low' | 'medium' | 'high',
    summary: record.summary ?? '분석 요약 없음',
  };
}
