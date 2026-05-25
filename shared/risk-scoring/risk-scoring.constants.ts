import type { CategoryScores } from './risk-scoring.types';

export const CATEGORY_WEIGHTS = {
  pii: 0.4,
  exif: 0.15,
  image: 0.3,
  context: 0.15,
} as const;

export const RISK_LEVEL_THRESHOLDS = {
  critical: 80,
  high: 60,
  medium: 35,
} as const;

export const SCORE_FORMULA_TEMPLATE =
  '0.40×PII + 0.15×EXIF + 0.30×Image + 0.15×Context';

export const EMPTY_CATEGORY_SCORES: CategoryScores = {
  pii: 0,
  exif: 0,
  image: 0,
  context: 0,
};

export const EMPTY_RISK_REASONS = {
  pii: [] as string[],
  exif: [] as string[],
  image: [] as string[],
  context: [] as string[],
};
