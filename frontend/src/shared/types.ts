export type TabKey = 'home' | 'history' | 'settings';

export type InferenceMode = 'local' | 'server';

export type Platform = 'instagram' | 'x' | 'facebook' | 'other';

export type ModelStatus = 'not-loaded' | 'loading' | 'ready' | 'error';

export type StageStatus = 'pending' | 'running' | 'done';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface HistoryItem {
  id: string;
  date: string;
  platform: Platform;
  riskLevel: RiskLevel;
  summary: string;
}

export interface AnalysisInput {
  text: string;
  platform: Platform;
  imageName?: string;
  imageFile?: File;
}

export interface AnalysisStage {
  id: string;
  title: string;
  status: StageStatus;
  logs: string[];
}

export interface RiskDetail {
  id: string;
  type: string;
  description: string;
  location: string;
  policyRef: string;
}

export type MaskCategory = 'face' | 'license_plate' | 'building_sign';

/** 이미지 대비 0~1 정규화 좌표 */
export interface NormalizedBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MaskRegion {
  id: string;
  category: MaskCategory;
  label: string;
  bbox: NormalizedBbox;
  confidence?: number;
  checked: boolean;
  source: 'auto' | 'user' | 'fallback';
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

export interface MemorySignal {
  matched: boolean;
  memoryMatchScore: number;
  piiBoost: number;
  contextBoost: number;
  shouldBlock: boolean;
  message?: string;
}

export interface RiskReportData {
  score: number;
  riskLevel: RiskLevel;
  categoryScores: CategoryScores;
  scoreBreakdown: ScoreBreakdown;
  riskReasons: RiskReasons;
  escalationRules: string[];
  memorySignal?: MemorySignal;
  uploadBlocked?: boolean;
  piiItems: RiskDetail[];
  exifSummary: string;
  imageRiskSummary: string;
  /** 업로드 이미지 미리보기 (blob URL) */
  imagePreviewUrl?: string;
  /** 마스킹 적용 후 미리보기 (blob URL) */
  maskedImagePreviewUrl?: string;
  /** 마스킹 대상 영역 (Gemma·OwlViT 합집합, 카테고리당 1개) */
  maskRegions: MaskRegion[];
  /** 마스킹 후보 생성 메타 (UI 안내용) */
  maskCandidateMeta?: {
    gemmaCategories: MaskCategory[];
    detectedCategories: MaskCategory[];
    unionCategories: MaskCategory[];
    skippedCategories?: MaskCategory[];
  };
  contextSummary: string;
  memoryPattern: {
    hasData: boolean;
    frequencies: Array<{ label: string; value: number }>;
    keywords: string[];
  };
  originalText: string;
  rewrittenText: string;
}

export interface ServerLlmSettings {
  chatUrl: string;
  apiKey: string;
  model: string;
}

export interface SettingsState {
  inferenceMode: InferenceMode;
  platforms: Record<Platform, boolean>;
  sensitivity: number;
  retentionDays: 7 | 30 | 90;
  notifications: boolean;
  serverLlm: ServerLlmSettings;
  privacyMemoryEnabled: boolean;
  privacyMemoryRetentionDays: number;
  privacyMemoryUseForBlocking: boolean;
  privacyMemoryUseForScoreBoost: boolean;
}

export interface ExtensionMessage {
  type: 'INJECTED_BUTTON_CLICK' | 'CONTEXT_ANALYZE_TEXT';
  payload?: {
    selectedText?: string;
  };
}
