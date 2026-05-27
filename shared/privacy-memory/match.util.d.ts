import type { MemorySignal, PrivacyMemoryCandidate, PrivacyMemoryProfile, PrivacyMemorySettings } from './privacy-memory.types';
export declare function computeMemoryMatchScore(candidate: PrivacyMemoryCandidate, profile: PrivacyMemoryProfile): number;
export declare const MIN_SEEN_COUNT_FOR_BLOCK = 2;
export declare function buildMemorySignal(matchScore: number, candidate: PrivacyMemoryCandidate, settings: PrivacyMemorySettings, profileSeenCount?: number): MemorySignal;
export declare function findBestMemoryMatch(candidate: PrivacyMemoryCandidate, profiles: PrivacyMemoryProfile[], settings: PrivacyMemorySettings): MemorySignal;
