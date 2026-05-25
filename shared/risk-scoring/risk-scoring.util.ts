import { CATEGORY_WEIGHTS, SCORE_FORMULA_TEMPLATE } from './risk-scoring.constants';
import type { CategoryScores, RiskLevel, ScoreBreakdown } from './risk-scoring.types';

export function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function clampCategoryScore(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return clampScore(n);
}

export function calculateFinalRiskScore(categoryScores: CategoryScores): number {
  const score =
    categoryScores.pii * CATEGORY_WEIGHTS.pii +
    categoryScores.exif * CATEGORY_WEIGHTS.exif +
    categoryScores.image * CATEGORY_WEIGHTS.image +
    categoryScores.context * CATEGORY_WEIGHTS.context;
  return clampScore(score);
}

export function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

const LEVEL_ORDER: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

export function maxRiskLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return LEVEL_ORDER[Math.max(LEVEL_ORDER.indexOf(a), LEVEL_ORDER.indexOf(b))] ?? b;
}

export function buildScoreBreakdown(categoryScores: CategoryScores): ScoreBreakdown {
  const piiWeighted = Math.round(categoryScores.pii * CATEGORY_WEIGHTS.pii * 10) / 10;
  const exifWeighted = Math.round(categoryScores.exif * CATEGORY_WEIGHTS.exif * 10) / 10;
  const imageWeighted = Math.round(categoryScores.image * CATEGORY_WEIGHTS.image * 10) / 10;
  const contextWeighted =
    Math.round(categoryScores.context * CATEGORY_WEIGHTS.context * 10) / 10;

  const formula = `${SCORE_FORMULA_TEMPLATE} = ${piiWeighted} + ${exifWeighted} + ${imageWeighted} + ${contextWeighted}`;

  return {
    piiWeighted,
    exifWeighted,
    imageWeighted,
    contextWeighted,
    formula,
  };
}
