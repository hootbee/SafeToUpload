import type { PrivacyMemoryCandidate } from '@shared/privacy-memory';

export interface PrivacyMemoryProfileRecord {
  id: string;
  userId: string;
  piiTypes: string[];
  contextTags: string[];
  riskyCombinations: string[];
  sourceTypes: string[];
  seenCount: number;
  riskWeight: number;
  confidence: number;
  lastRiskLevel: string | null;
  lastRiskScoreBand: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  expiresAt: Date | null;
}

export interface PrivacyMemoryRepository {
  findActiveProfiles(userId: string): Promise<PrivacyMemoryProfileRecord[]>;
  upsertProfile(userId: string, candidate: PrivacyMemoryCandidate, meta: {
    lastRiskLevel: string;
    lastRiskScoreBand: string;
    retentionDays: number;
  }): Promise<void>;
  deleteAll(userId: string): Promise<number>;
  deleteExpired(userId: string): Promise<number>;
}
