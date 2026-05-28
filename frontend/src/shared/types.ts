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
  /** 문맥 요약 (저장·상세용, 이력 목록 미리보기에는 riskScore 사용) */
  summary: string;
  riskScore?: number | null;
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

export type MaskRegionSource = 'gemma' | 'owl' | 'layout' | 'fallback' | 'user' | 'auto';

/** 이미지 대비 0~1 정규화 좌표 */
export interface NormalizedBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 마스킹 파이프라인 단계별 탐지 내역 (디버그·UI 표시) */
export type MaskTraceStage = 'gemma' | 'heuristic' | 'expand' | 'owl' | 'region';

export interface MaskTraceEntry {
  stage: MaskTraceStage;
  type: string;
  label: string;
  detail: string;
}

export interface MaskDetectionTrace {
  gemmaCount: number;
  preparedCount: number;
  owlCount: number;
  regionCount: number;
  entries: MaskTraceEntry[];
}

export interface MaskRegion {
  id: string;
  /** imageRisks.type (동적) */
  riskType: string;
  /** OwlViT·패딩 라우팅용 (선택) */
  category?: MaskCategory;
  label: string;
  bbox: NormalizedBbox;
  confidence?: number;
  checked: boolean;
  source: MaskRegionSource;
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
  /** 여러 장 업로드 시 전체 미리보기 (blob URL 목록) */
  imagePreviewUrls?: string[];
  /** 마스킹 적용 후 미리보기 (blob URL) */
  maskedImagePreviewUrl?: string;
  /** imageRisks 항목 기반 마스킹 영역 */
  maskRegions: MaskRegion[];
  /** 원본 imageRisks 레코드 (bbox 재탐지 재시도용) */
  imageRisksRaw?: Array<Record<string, unknown>>;
  /** Gemma imageRisks 스냅샷 (리포트 시점) */
  imageRisksSnapshot?: Array<{ type: string; label: string; hasBbox: boolean }>;
  /** 마스킹 후보 생성 메타 (UI 안내용) */
  maskCandidateMeta?: {
    riskCount: number;
    skippedRegionIds: string[];
    skippedLabels: string[];
    /** Gemma가 반환했으나 bbox 없어 체크박스를 만들지 못한 label */
    unlocatedLabels?: string[];
    detectionTrace?: MaskDetectionTrace;
    /** LLM 디코딩 원문 (앞부분) */
    llmRawPreview?: string;
    parseNote?: string;
  };
  contextSummary: string;
  memoryPattern: {
    hasData: boolean;
    frequencies: Array<{ label: string; value: number }>;
    keywords: string[];
  };
  originalText: string;
  rewrittenText: string;
  /** 모델 원본 응답(raw content/json) 디버그 뷰 */
  rewriteRawResponse?: string;
  /** 다중 이미지 분석 시 이미지별 마스킹 데이터 */
  imageEntries?: Array<{
    imageName?: string;
    imagePreviewUrl?: string;
    maskedImagePreviewUrl?: string;
    imageRiskSummary: string;
    maskRegions: MaskRegion[];
  }>;
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
  type: 'INJECTED_BUTTON_CLICK' | 'CONTEXT_ANALYZE_TEXT' | 'PLATFORM_URL_CHANGED';
  payload?: {
    selectedText?: string;
    tabUrl?: string;
  };
}
