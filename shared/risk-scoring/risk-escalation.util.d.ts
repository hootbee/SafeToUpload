import type { DetectedSignals, RiskLevel } from './risk-scoring.types';
export interface EscalationResult {
    score: number;
    level: RiskLevel;
    escalations: string[];
}
export declare function applyRiskEscalationRules(score: number, level: RiskLevel, signals: DetectedSignals): EscalationResult;
