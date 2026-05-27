import { type PrivacyMemoryCandidate } from './privacy-memory.types';
export declare function sanitizePrivacyMemoryCandidate(raw: Partial<PrivacyMemoryCandidate> | undefined): PrivacyMemoryCandidate;
export declare function containsRawPiiInProfile(data: unknown): boolean;
