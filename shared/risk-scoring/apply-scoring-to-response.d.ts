import type { AnalysisScoringInput } from './risk-scoring.types';
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
export declare function applyDeterministicScoring(input: AnalysisScoringInput, memoryBoost?: {
    piiBoost: number;
    contextBoost: number;
}): ScoringFields;
