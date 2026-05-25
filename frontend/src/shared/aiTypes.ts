import type { InferenceMode, Platform } from './types';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AiPiiItem {
  type?: string;
  label?: string;
  text?: string;
  severity?: string;
  startIndex?: number;
  endIndex?: number;
  description?: string;
  location?: string;
  policyRef?: string;
}

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
  piiItems: AiPiiItem[];
  exifItems: Array<Record<string, unknown>>;
  imageRisks: Array<Record<string, unknown>>;
  contextResult: Record<string, unknown>;
  rewriteSuggestion: string;
  privacyMemoryCandidate?: PrivacyMemoryCandidate;
  memorySignal?: MemorySignal;
  rawAiResponse: Record<string, unknown>;
}

export interface ServerLlmConfigPayload {
  chatUrl?: string;
  apiKey?: string;
  model?: string;
}

export interface CreateAnalysisPayload {
  sourceType: 'manual' | 'context-menu' | 'content-script' | 'image-upload';
  platform: Platform;
  inferenceMode: InferenceMode;
  pageUrl?: string;
  inputText?: string;
  imagePath?: string;
}

export interface AnalysisRecordResponse {
  id: string;
  sourceType: string;
  platform: string;
  inferenceMode?: string;
  imagePath?: string | null;
  status: string;
  riskScore: number | null;
  riskLevel: string | null;
  summary: string | null;
  piiTypes?: unknown;
  piiCount?: number | null;
  inputText?: string | null;
  result?: {
    piiItems?: unknown;
    exifItems?: unknown;
    imageRisks?: unknown;
    contextResult?: unknown;
    categoryScores?: unknown;
    scoreBreakdown?: unknown;
    riskReasons?: unknown;
    escalationRules?: unknown;
    rewriteSuggestion?: string | null;
    rawAiResponse?: unknown;
  } | null;
}

export interface HistoryRecordDto {
  id: string;
  platform: string;
  riskScore: number | null;
  riskLevel: string | null;
  summary: string | null;
  createdAt: string;
}

export interface SettingsDto {
  id: string;
  targetPlatforms: string[];
  inferenceMode: InferenceMode;
  sensitivity: number;
  retentionDays: number;
  notificationEnabled: boolean;
  privacyMemoryEnabled?: boolean;
  privacyMemoryRetentionDays?: number;
  privacyMemoryUseForBlocking?: boolean;
  privacyMemoryUseForScoreBoost?: boolean;
}

export interface PrivacyMemoryProfileSummary {
  id: string;
  piiTypes: string[];
  contextTags: string[];
  riskyCombinations: string[];
  seenCount: number;
  lastSeenAt: string;
  lastRiskLevel?: string | null;
}
