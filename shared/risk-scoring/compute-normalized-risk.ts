import { normalizeCategoryScores } from './category-score-fallback.util';
import { extractDetectedSignals } from './detected-signals.util';
import { applyRiskEscalationRules } from './risk-escalation.util';
import type { AnalysisScoringInput, NormalizedRiskResult } from './risk-scoring.types';
import {
  buildScoreBreakdown,
  calculateFinalRiskScore,
  calculateRiskLevel,
} from './risk-scoring.util';

export function computeNormalizedRisk(input: AnalysisScoringInput): NormalizedRiskResult {
  const { categoryScores, riskReasons } = normalizeCategoryScores(input);
  const baseScore = calculateFinalRiskScore(categoryScores);
  const baseLevel = calculateRiskLevel(baseScore);
  const signals = extractDetectedSignals(input);
  const escalated = applyRiskEscalationRules(baseScore, baseLevel, signals);

  return {
    riskScore: escalated.score,
    riskLevel: escalated.level,
    categoryScores,
    scoreBreakdown: buildScoreBreakdown(categoryScores),
    riskReasons,
    escalationRules: escalated.escalations,
  };
}
