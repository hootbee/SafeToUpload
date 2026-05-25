import { RiskLevel } from '../../common/enums/risk-level.enum';

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

export interface PrivacyMemoryCandidate {
  piiTypes?: string[];
  contextTags?: string[];
  riskyCombinations?: string[];
  sourceTypes?: string[];
  confidence?: number;
  riskWeight?: number;
}

export interface MemorySignal {
  matched: boolean;
  memoryMatchScore: number;
  piiBoost: number;
  contextBoost: number;
  shouldBlock: boolean;
  message?: string;
}

export interface AiAnalysisResponse {
  riskScore: number;
  riskLevel: RiskLevel;
  categoryScores: CategoryScores;
  scoreBreakdown: ScoreBreakdown;
  riskReasons: RiskReasons;
  escalationRules: string[];
  piiItems: unknown[];
  exifItems: unknown[];
  imageRisks: unknown[];
  contextResult: Record<string, unknown>;
  rewriteSuggestion: string;
  privacyMemoryCandidate?: PrivacyMemoryCandidate;
  memorySignal?: MemorySignal;
  rawAiResponse: Record<string, unknown>;
}
