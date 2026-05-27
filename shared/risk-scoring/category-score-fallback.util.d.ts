import type { AnalysisScoringInput, CategoryScores, RiskReasons } from './risk-scoring.types';
export declare function dedupeReasons(items: string[]): string[];
export declare function dedupeRiskReasons(reasons: Partial<RiskReasons> | undefined): RiskReasons;
export declare function normalizeCategoryScores(input: AnalysisScoringInput): {
    categoryScores: CategoryScores;
    riskReasons: RiskReasons;
};
export declare function emptyCategoryScores(): CategoryScores;
export declare function emptyRiskReasons(): RiskReasons;
