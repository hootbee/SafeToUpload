import type { CategoryScores, RiskLevel, ScoreBreakdown } from './risk-scoring.types';
export declare function clampScore(score: number): number;
export declare function clampCategoryScore(value: unknown): number | null;
export declare function calculateFinalRiskScore(categoryScores: CategoryScores): number;
export declare function calculateRiskLevel(score: number): RiskLevel;
export declare function maxRiskLevel(a: RiskLevel, b: RiskLevel): RiskLevel;
export declare function buildScoreBreakdown(categoryScores: CategoryScores): ScoreBreakdown;
