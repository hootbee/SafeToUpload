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

export interface AiAnalysisResponse {
  riskScore: number;
  riskLevel: RiskLevel;
  piiItems: AiPiiItem[];
  exifItems: Array<Record<string, unknown>>;
  imageRisks: Array<Record<string, unknown>>;
  contextResult: Record<string, unknown>;
  rewriteSuggestion: string;
  rawAiResponse: Record<string, unknown>;
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
}
