import { applyDeterministicScoring, computeNormalizedRisk } from '@shared/risk-scoring';
import { toImageRiskRecords } from '../../../shared/image-risk.types';
import type { AiAnalysisResponse, AiPiiItem, PrivacyMemoryCandidate } from '../shared/aiTypes';
import type { AnalysisInput, Platform, RiskReportData } from '../shared/types';
import type { RiskDetectionHit } from './imageDetectService';
import { parseImageRiskItems } from './imageRiskHeuristics';
import { extractLlmDebugMeta } from './llmDebug.util';
import { buildDynamicImageRiskSummary, buildMaskRegionsFromRisks } from './imageMaskService';
import { sanitizeExifItems } from './imageExifService';

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

  const hasImage = Boolean(input.imageFile || input.imageName);
  const exifItems = sanitizeExifItems(partial.exifItems);

  const scoring = applyDeterministicScoring({
    piiItems: piiItems as Array<Record<string, unknown>>,
    exifItems,
    imageRisks: Array.isArray(partial.imageRisks) ? partial.imageRisks : [],
    contextResult:
      partial.contextResult && typeof partial.contextResult === 'object'
        ? partial.contextResult
        : { summary: '문맥 분석 결과가 없습니다.' },
    categoryScores: partial.categoryScores,
    riskReasons: partial.riskReasons,
    platform: input.platform,
    hasImage,
  });

  const privacyMemoryCandidate =
    partial.privacyMemoryCandidate && typeof partial.privacyMemoryCandidate === 'object'
      ? (partial.privacyMemoryCandidate as PrivacyMemoryCandidate)
      : undefined;

  return {
    riskScore: scoring.riskScore,
    riskLevel: scoring.riskLevel,
    categoryScores: scoring.categoryScores,
    scoreBreakdown: scoring.scoreBreakdown,
    riskReasons: scoring.riskReasons,
    escalationRules: scoring.escalationRules,
    piiItems,
    exifItems,
    imageRisks: Array.isArray(partial.imageRisks) ? partial.imageRisks : [],
    contextResult:
      partial.contextResult && typeof partial.contextResult === 'object'
        ? partial.contextResult
        : { summary: '문맥 분석 결과가 없습니다.' },
    rewriteSuggestion: resolveRewriteSuggestion(
      partial as Partial<AiAnalysisResponse> & Record<string, unknown>,
      text,
    ),
    privacyMemoryCandidate,
    memorySignal: partial.memorySignal,
    rawAiResponse: partial.rawAiResponse ?? { mode: 'local' },
  };
}

/** OwlViT는 기존 Gemma 항목의 bbox만 보완 — 새 imageRisks 항목을 추가하지 않음 */
function attachDetectionBboxToImageRisks(
  imageRisks: Array<Record<string, unknown>>,
  detections: RiskDetectionHit[],
): Array<Record<string, unknown>> {
  if (detections.length === 0) return imageRisks;

  const bboxByType = new Map<string, RiskDetectionHit>();
  for (const hit of detections) {
    const prev = bboxByType.get(hit.riskType);
    if (!prev || hit.score > prev.score) {
      bboxByType.set(hit.riskType, hit);
    }
  }

  return imageRisks.map((raw) => {
    const type = String(raw.type ?? '');
    const hit = bboxByType.get(type);
    if (!hit || (raw.bbox && typeof raw.bbox === 'object')) return raw;
    return {
      ...raw,
      bbox: hit.bbox,
      description:
        String(raw.description ?? '') ||
        `OwlViT bbox 보완 (신뢰도 ${Math.round(hit.score * 100)}%)`,
    };
  });
}

/** OwlViT 탐지·imageRisks 반영 후 점수·원인 재계산 (분석 시점보다 리포트 시점이 정확함) */
function applyImageEvidenceToAi(
  ai: AiAnalysisResponse,
  input: AnalysisInput,
  detections: RiskDetectionHit[],
): AiAnalysisResponse {
  const hasImage = Boolean(input.imageFile || input.imageName);
  if (!hasImage) return ai;

  const imageRiskItems = parseImageRiskItems(
    attachDetectionBboxToImageRisks(
      ai.imageRisks as Array<Record<string, unknown>>,
      detections,
    ),
  );
  const imageRisks = toImageRiskRecords(imageRiskItems);

  const normalized = computeNormalizedRisk({
    piiItems: ai.piiItems as Array<Record<string, unknown>>,
    exifItems: ai.exifItems,
    imageRisks,
    contextResult: ai.contextResult,
    categoryScores: {
      pii: ai.categoryScores.pii,
      exif: ai.categoryScores.exif,
      context: ai.categoryScores.context,
    },
    riskReasons: ai.riskReasons,
    platform: input.platform,
    hasImage: true,
  });

  const memoryBoost =
    ai.memorySignal?.matched && ai.memorySignal.piiBoost + ai.memorySignal.contextBoost > 0
      ? { piiBoost: ai.memorySignal.piiBoost, contextBoost: ai.memorySignal.contextBoost }
      : undefined;

  const scoring = memoryBoost
    ? applyDeterministicScoring(
        {
          piiItems: ai.piiItems as Array<Record<string, unknown>>,
          exifItems: ai.exifItems,
          imageRisks,
          contextResult: ai.contextResult,
          categoryScores: {
            pii: normalized.categoryScores.pii,
            exif: normalized.categoryScores.exif,
            context: normalized.categoryScores.context,
          },
          riskReasons: normalized.riskReasons,
          platform: input.platform,
          hasImage: true,
        },
        memoryBoost,
      )
    : {
        riskScore: normalized.riskScore,
        riskLevel: normalized.riskLevel,
        categoryScores: normalized.categoryScores,
        scoreBreakdown: normalized.scoreBreakdown,
        riskReasons: normalized.riskReasons,
        escalationRules: normalized.escalationRules,
      };

  const escalationRules = [...new Set([...ai.escalationRules, ...scoring.escalationRules])];

  return {
    ...ai,
    imageRisks,
    riskScore: scoring.riskScore,
    riskLevel: scoring.riskLevel,
    categoryScores: scoring.categoryScores,
    scoreBreakdown: scoring.scoreBreakdown,
    riskReasons: scoring.riskReasons,
    escalationRules,
  };
}

export function mapAiResponseToReport(
  ai: AiAnalysisResponse,
  input: AnalysisInput,
  detections: RiskDetectionHit[] = [],
): RiskReportData {
  const aiWithImage = applyImageEvidenceToAi(ai, input, detections);

  const contextSummary = String(aiWithImage.contextResult.summary ?? '컨텍스트 분석 완료');
  const exifItems = sanitizeExifItems(aiWithImage.exifItems);
  const exifSummary =
    exifItems.length > 0
      ? exifItems.map((item) => String(item.label ?? item.type ?? '사진 메타정보')).join(', ')
      : '이미지 메타데이터 위험 없음';

  const hasImage = Boolean(input.imageFile || input.imageName);
  const maskBuild = buildMaskRegionsFromRisks(
    aiWithImage,
    hasImage,
    detections,
    input.text,
    input.imageName ?? input.imageFile?.name,
  );
  const imageRiskSummary = hasImage
    ? buildDynamicImageRiskSummary(maskBuild)
    : '이미지 미업로드, 텍스트 중심 분석';

  const keywords = aiWithImage.piiItems
    .map((item) => item.text || item.label || item.type)
    .filter(Boolean)
    .slice(0, 6) as string[];

  const imageRisksSnapshot = (aiWithImage.imageRisks as Array<Record<string, unknown>>).map((item) => ({
    type: String(item.type ?? ''),
    label: String(item.label ?? item.type ?? ''),
    hasBbox: Boolean(item.bbox && typeof item.bbox === 'object'),
  }));

  const llmDebug = extractLlmDebugMeta(aiWithImage.rawAiResponse as Record<string, unknown>);
  const rewriteRawResponse = (() => {
    const raw = aiWithImage.rawAiResponse as Record<string, unknown> | undefined;
    const rawContent = raw?.rawContent;
    if (typeof rawContent === 'string' && rawContent.trim()) {
      return rawContent;
    }
    if (!raw) return undefined;
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return undefined;
    }
  })();

  return {
    score: aiWithImage.riskScore,
    riskLevel: aiWithImage.riskLevel,
    categoryScores: aiWithImage.categoryScores,
    scoreBreakdown: aiWithImage.scoreBreakdown,
    riskReasons: aiWithImage.riskReasons,
    escalationRules: aiWithImage.escalationRules,
    memorySignal: aiWithImage.memorySignal,
    uploadBlocked: aiWithImage.memorySignal?.shouldBlock ?? false,
    piiItems: aiWithImage.piiItems.map((item, index) => mapPiiToRiskDetail(item, index)),
    exifSummary,
    imageRiskSummary,
    contextSummary,
    memoryPattern: {
      hasData: keywords.length > 0,
      frequencies: summarizeFrequencies(ai.piiItems),
      keywords,
    },
    originalText: input.text,
    rewrittenText: aiWithImage.rewriteSuggestion,
    rewriteRawResponse,
    maskRegions: maskBuild.regions,
    imageRisksRaw: aiWithImage.imageRisks as Array<Record<string, unknown>>,
    imageRisksSnapshot,
    maskCandidateMeta: {
      riskCount: maskBuild.riskCount,
      skippedRegionIds: maskBuild.skippedRegionIds,
      skippedLabels: maskBuild.skippedLabels,
      unlocatedLabels: maskBuild.unlocatedLabels,
      detectionTrace: maskBuild.detectionTrace,
      ...llmDebug,
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
    rawAiResponse?: unknown;
  } | null;
}, platform: Platform, imageName?: string, detections: RiskDetectionHit[] = []): RiskReportData {
  const input: AnalysisInput = { text: record.inputText ?? '', platform, imageName };
  const ctx = (record.result?.contextResult as Record<string, unknown>) ?? {};
  const ai = normalizeAiResponse(
    {
      riskScore: record.riskScore ?? undefined,
      riskLevel: undefined,
      categoryScores: ((record.result as Record<string, unknown> | undefined)?.categoryScores ??
        ctx.categoryScores) as AiAnalysisResponse['categoryScores'],
      riskReasons: ((record.result as Record<string, unknown> | undefined)?.riskReasons ??
        ctx.riskReasons) as AiAnalysisResponse['riskReasons'],
      piiItems: (record.result?.piiItems as AiPiiItem[]) ?? [],
      exifItems: (record.result?.exifItems as Array<Record<string, unknown>>) ?? [],
      imageRisks: (record.result?.imageRisks as Array<Record<string, unknown>>) ?? [],
      contextResult: { ...ctx, summary: record.summary ?? ctx.summary ?? '' },
      rewriteSuggestion: record.result?.rewriteSuggestion ?? '',
      escalationRules: ((record.result as Record<string, unknown> | undefined)?.escalationRules ??
        ctx.escalationRules) as string[],
      scoreBreakdown: ctx.scoreBreakdown as AiAnalysisResponse['scoreBreakdown'],
      memorySignal: ctx.memorySignal as AiAnalysisResponse['memorySignal'],
      rawAiResponse:
        (record.result?.rawAiResponse as Record<string, unknown>) ?? { mode: 'server' },
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
    riskLevel: (record.riskLevel ?? 'low') as import('../shared/types').RiskLevel,
    summary: record.summary ?? '분석 요약 없음',
  };
}
