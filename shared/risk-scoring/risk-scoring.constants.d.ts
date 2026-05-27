import type { CategoryScores } from './risk-scoring.types';
export declare const CATEGORY_WEIGHTS: {
    readonly pii: 0.4;
    readonly exif: 0.15;
    readonly image: 0.3;
    readonly context: 0.15;
};
export declare const RISK_LEVEL_THRESHOLDS: {
    readonly critical: 80;
    readonly high: 60;
    readonly medium: 35;
};
export declare const SCORE_FORMULA_TEMPLATE = "0.40\u00D7PII + 0.15\u00D7EXIF + 0.30\u00D7Image + 0.15\u00D7Context";
export declare const EMPTY_CATEGORY_SCORES: CategoryScores;
export declare const EMPTY_RISK_REASONS: {
    pii: string[];
    exif: string[];
    image: string[];
    context: string[];
};
