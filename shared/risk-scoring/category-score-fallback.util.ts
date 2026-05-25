import { EMPTY_CATEGORY_SCORES, EMPTY_RISK_REASONS } from './risk-scoring.constants';
import type { AnalysisScoringInput, CategoryScores, RiskReasons } from './risk-scoring.types';
import { clampCategoryScore, clampScore } from './risk-scoring.util';
import { extractDetectedSignals } from './detected-signals.util';

function norm(value: unknown): string {
  return String(value ?? '').toLowerCase();
}

function reasonDedupeKey(text: string): string {
  return text.trim().replace(/\s+/g, ' ').replace(/[.．…]+$/u, '');
}

export function dedupeReasons(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = reasonDedupeKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
    if (out.length >= 8) break;
  }
  return out;
}

function asReasonList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

export function dedupeRiskReasons(reasons: Partial<RiskReasons> | undefined): RiskReasons {
  return {
    pii: dedupeReasons(asReasonList(reasons?.pii)),
    exif: dedupeReasons(asReasonList(reasons?.exif)),
    image: dedupeReasons(asReasonList(reasons?.image)),
    context: dedupeReasons(asReasonList(reasons?.context)),
  };
}

function mergeReasons(base: RiskReasons, partial?: Partial<RiskReasons>): RiskReasons {
  return dedupeRiskReasons({
    pii: [...asReasonList(partial?.pii), ...base.pii],
    exif: [...asReasonList(partial?.exif), ...base.exif],
    image: [...asReasonList(partial?.image), ...base.image],
    context: [...asReasonList(partial?.context), ...base.context],
  });
}

/** LLM이 0을 줘도 실제 탐지·이미지가 있으면 fallback 점수를 쓴다 */
function pickCategoryScore(
  llm: number | null,
  fallback: number,
  preferFallbackWhenZero: boolean,
): number {
  if (llm === null) return fallback;
  if (preferFallbackWhenZero && llm === 0 && fallback > 0) return fallback;
  return llm;
}

function estimatePiiScore(piiItems: Array<Record<string, unknown>>): { score: number; reasons: string[] } {
  if (piiItems.length === 0) {
    return { score: 15, reasons: [] };
  }

  const reasons: string[] = [];
  let score = 30;

  const highRisk = piiItems.some((item) =>
    ['government_id', 'account', 'card', '주민', '계좌', '카드'].some((p) =>
      `${norm(item.type)} ${norm(item.label)}`.includes(p),
    ),
  );
  const hasPhone = piiItems.some((item) => norm(item.type).includes('phone') || norm(item.label).includes('전화'));
  const hasEmail = piiItems.some((item) => norm(item.type).includes('email') || norm(item.label).includes('이메일'));
  const hasName = piiItems.some((item) => norm(item.type).includes('name') || norm(item.label).includes('이름'));

  if (highRisk) {
    score = 92;
    reasons.push('고위험 식별정보가 포함되어 있습니다.');
  } else if (piiItems.length >= 3 || (hasPhone && hasEmail && hasName)) {
    score = 82;
    reasons.push('복수의 직접 식별 개인정보가 포함되어 있습니다.');
  } else if (hasPhone || hasName) {
    score = 62;
    reasons.push('전화번호 또는 이름 등 직접 식별 정보가 포함되어 있습니다.');
  } else if (hasEmail) {
    score = 38;
    reasons.push('이메일 주소가 포함되어 있습니다.');
  } else {
    score = 45;
    reasons.push('개인정보 후보가 탐지되었습니다.');
  }

  return { score: clampScore(score), reasons };
}

function estimateExifScore(exifItems: Array<Record<string, unknown>>, signals: ReturnType<typeof extractDetectedSignals>): { score: number; reasons: string[] } {
  if (exifItems.length === 0 && !signals.hasGpsExif) {
    return { score: 5, reasons: [] };
  }

  const reasons: string[] = [];
  let score = 25;

  const hasGps = exifItems.some((item) => ['gps', 'location', '위치'].some((p) => `${norm(item.type)} ${norm(item.label)}`.includes(p))) || signals.hasGpsExif;
  const hasDatetime = exifItems.some((item) => ['date', 'time', '촬영'].some((p) => `${norm(item.type)} ${norm(item.label)}`.includes(p)));

  if (hasGps && signals.isPublicContext) {
    score = 88;
    reasons.push('GPS 위치 정보가 공개 업로드 문맥에서 노출될 수 있습니다.');
  } else if (hasGps) {
    score = 78;
    reasons.push('GPS 또는 위치 추정 가능 메타데이터가 포함될 수 있습니다.');
  } else if (hasDatetime) {
    score = 42;
    reasons.push('촬영 일시 메타데이터가 포함될 수 있습니다.');
  } else {
    score = 28;
    reasons.push('일반 EXIF 메타데이터가 포함될 수 있습니다.');
  }

  return { score: clampScore(score), reasons };
}

function estimateImageScore(
  imageRisks: Array<Record<string, unknown>>,
  signals: ReturnType<typeof extractDetectedSignals>,
  hasImage: boolean,
): { score: number; reasons: string[] } {
  if (imageRisks.length === 0 && !hasImage) {
    return { score: 0, reasons: [] };
  }
  if (imageRisks.length === 0 && hasImage) {
    return { score: 40, reasons: ['업로드된 이미지가 분석에 포함되었습니다.'] };
  }

  const reasons: string[] = [];
  let score = 35;

  if (signals.hasIdCardImage) {
    score = 95;
    reasons.push('신분증·여권·학생증으로 보이는 이미지가 포함되어 있습니다.');
  } else if (signals.hasSensitiveDocument) {
    score = 82;
    reasons.push('문서·계약서·영수증 등 민감 문서가 포함되어 있습니다.');
  } else if (signals.hasBuildingSign) {
    score = 68;
    reasons.push('건물·동·호수 간판 등 주소를 특정할 수 있는 표식이 보입니다.');
  } else if (signals.hasLicensePlate) {
    score = 62;
    reasons.push('차량 번호판이 보일 수 있습니다.');
  } else if (signals.hasFace && signals.hasDirectPii) {
    score = 88;
    reasons.push('얼굴과 직접 식별 개인정보가 함께 포함되어 있습니다.');
  } else if (signals.hasFace) {
    score = 58;
    reasons.push('얼굴이 포함되어 있습니다.');
  } else {
    score = 55;
    reasons.push('이미지 내 식별 가능 요소가 포함되어 있습니다.');
  }

  return { score: clampScore(score), reasons };
}

function estimateContextScore(
  contextResult: Record<string, unknown>,
  platform: string | undefined,
  signals: ReturnType<typeof extractDetectedSignals>,
): { score: number; reasons: string[] } {
  const ctxHay = JSON.stringify(contextResult).toLowerCase();
  const reasons: string[] = [];
  let score = 18;

  if (signals.hasMinorOrThirdParty && signals.isPublicContext) {
    score = 88;
    reasons.push('공개 업로드 문맥에서 제3자·미성년자 정보 가능성이 있습니다.');
  } else if (signals.isPublicContext) {
    score = 62;
    reasons.push('공개 SNS 업로드 문맥에서는 개인정보 노출 위험이 높습니다.');
  } else if (ctxHay.includes('share') || ctxHay.includes('공유')) {
    score = 35;
    reasons.push('제한된 공유 문맥이 감지되었습니다.');
  } else if (platform && platform !== 'other') {
    score = 55;
    reasons.push(`${platform} 플랫폼 업로드 문맥이 반영되었습니다.`);
  }

  return { score: clampScore(score), reasons };
}

export function normalizeCategoryScores(input: AnalysisScoringInput): {
  categoryScores: CategoryScores;
  riskReasons: RiskReasons;
} {
  const signals = extractDetectedSignals(input);
  const partial = input.categoryScores ?? {};
  const llmPii = clampCategoryScore(partial.pii);
  const llmExif = clampCategoryScore(partial.exif);
  const llmImage = clampCategoryScore(partial.image);
  const llmContext = clampCategoryScore(partial.context);

  const piiFallback = estimatePiiScore(input.piiItems ?? []);
  const exifFallback = estimateExifScore(input.exifItems ?? [], signals);
  const hasImage = Boolean(input.hasImage);
  const imageFallback = estimateImageScore(input.imageRisks ?? [], signals, hasImage);
  const contextFallback = estimateContextScore(
    input.contextResult ?? {},
    input.platform,
    signals,
  );

  const categoryScores: CategoryScores = {
    pii: pickCategoryScore(llmPii, piiFallback.score, (input.piiItems?.length ?? 0) > 0),
    exif: pickCategoryScore(llmExif, exifFallback.score, (input.exifItems?.length ?? 0) > 0),
    image: pickCategoryScore(llmImage, imageFallback.score, hasImage || (input.imageRisks?.length ?? 0) > 0),
    context: pickCategoryScore(llmContext, contextFallback.score, false),
  };

  const riskReasons = mergeReasons(
    {
      pii: piiFallback.reasons,
      exif: exifFallback.reasons,
      image: imageFallback.reasons,
      context: contextFallback.reasons,
    },
    input.riskReasons,
  );

  if (riskReasons.pii.length === 0 && categoryScores.pii > 20) {
    riskReasons.pii = ['개인정보 노출 가능성이 있습니다.'];
  }

  return { categoryScores, riskReasons };
}

export function emptyCategoryScores(): CategoryScores {
  return { ...EMPTY_CATEGORY_SCORES };
}

export function emptyRiskReasons(): RiskReasons {
  return {
    pii: [...EMPTY_RISK_REASONS.pii],
    exif: [...EMPTY_RISK_REASONS.exif],
    image: [...EMPTY_RISK_REASONS.image],
    context: [...EMPTY_RISK_REASONS.context],
  };
}
