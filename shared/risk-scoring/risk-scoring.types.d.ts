export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export interface CategoryScores {
    pii: number;
    exif: number;
    image: number;
    context: number;
}
export interface ScoreBreakdown {
    piiWeighted: number;
    exifWeighted: number;
    imageWeighted: number;
    contextWeighted: number;
    formula: string;
}
export interface RiskReasons {
    pii: string[];
    exif: string[];
    image: string[];
    context: string[];
}
export interface DetectedSignals {
    hasGovernmentId: boolean;
    hasBankAccount: boolean;
    hasCardNumber: boolean;
    hasIdCardImage: boolean;
    hasPassportOrStudentId: boolean;
    hasGpsExif: boolean;
    hasFace: boolean;
    hasDirectPii: boolean;
    isPublicContext: boolean;
    hasMinorOrThirdParty: boolean;
    hasSensitiveDocument: boolean;
    hasBuildingSign: boolean;
    hasLicensePlate: boolean;
    documentWithPii: boolean;
}
export interface AnalysisScoringInput {
    piiItems?: Array<Record<string, unknown>>;
    exifItems?: Array<Record<string, unknown>>;
    imageRisks?: Array<Record<string, unknown>>;
    contextResult?: Record<string, unknown>;
    categoryScores?: Partial<CategoryScores>;
    riskReasons?: Partial<RiskReasons>;
    platform?: string;
    hasImage?: boolean;
}
export interface NormalizedRiskResult {
    riskScore: number;
    riskLevel: RiskLevel;
    categoryScores: CategoryScores;
    scoreBreakdown: ScoreBreakdown;
    riskReasons: RiskReasons;
    escalationRules: string[];
}
