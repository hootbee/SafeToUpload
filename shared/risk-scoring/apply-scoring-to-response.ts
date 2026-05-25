import { computeNormalizedRisk } from './compute-normalized-risk';
import type { AnalysisScoringInput } from './risk-scoring.types';
import { clampScore } from './risk-scoring.util';

export interface ScoringFields {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  categoryScores: {
    pii: number;
    exif: number;
    image: number;
    context: number;
  };
  scoreBreakdown: {
    piiWeighted: number;
    exifWeighted: number;
    imageWeighted: number;
    contextWeighted: number;
    formula: string;
  };
  riskReasons: {
    pii: string[];
    exif: string[];
    image: string[];
    context: string[];
  };
  escalationRules: string[];
}

export function applyDeterministicScoring(
  input: AnalysisScoringInput,
  memoryBoost?: { piiBoost: number; contextBoost: number },
): ScoringFields {
  let categoryScores = input.categoryScores;

  if (memoryBoost) {
    const base = computeNormalizedRisk(input);
    categoryScores = {
      pii: clampScore(base.categoryScores.pii + memoryBoost.piiBoost),
      exif: base.categoryScores.exif,
      image: base.categoryScores.image,
      context: clampScore(base.categoryScores.context + memoryBoost.contextBoost),
    };
  }

  const normalized = computeNormalizedRisk({
    ...input,
    categoryScores: categoryScores as AnalysisScoringInput['categoryScores'],
  });

  return {
    riskScore: normalized.riskScore,
    riskLevel: normalized.riskLevel,
    categoryScores: normalized.categoryScores,
    scoreBreakdown: normalized.scoreBreakdown,
    riskReasons: normalized.riskReasons,
    escalationRules: normalized.escalationRules,
  };
}
