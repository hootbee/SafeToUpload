import type { RiskLevel, ScoreBreakdown } from './types';

/** 위험 등급 — 결과 화면용 */
export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '매우 높음',
};

export type RiskCategoryKey = 'pii' | 'exif' | 'image' | 'context';

/** 카테고리별 점수 라벨 */
export const RISK_CATEGORY_LABEL: Record<RiskCategoryKey, string> = {
  pii: '개인정보',
  exif: '사진·파일 정보',
  image: '이미지 내용',
  context: '게시 상황',
};

const WEIGHT_LABEL: Record<RiskCategoryKey, string> = {
  pii: '개인정보',
  exif: '사진·파일 정보',
  image: '이미지',
  context: '게시 상황',
};

/** 점수 산출 공식을 한국어로 표시 */
export function formatScoreFormulaKorean(breakdown: ScoreBreakdown): string {
  return (
    `0.40×${WEIGHT_LABEL.pii} + 0.15×${WEIGHT_LABEL.exif} + 0.30×${WEIGHT_LABEL.image} + 0.15×${WEIGHT_LABEL.context}` +
    ` = ${breakdown.piiWeighted} + ${breakdown.exifWeighted} + ${breakdown.imageWeighted} + ${breakdown.contextWeighted}`
  );
}
