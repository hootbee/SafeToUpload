import type { PrivacyMemoryCandidate } from './privacy-memory.types';
export declare function buildCandidateFromAnalysis(input: {
    piiItems?: Array<Record<string, unknown>>;
    exifItems?: Array<Record<string, unknown>>;
    imageRisks?: Array<Record<string, unknown>>;
    contextResult?: Record<string, unknown>;
    privacyMemoryCandidate?: Partial<PrivacyMemoryCandidate>;
    platform?: string;
}): PrivacyMemoryCandidate;
