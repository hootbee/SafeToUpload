export type TabKey = 'home' | 'history' | 'settings';

export type Platform = 'instagram' | 'x' | 'facebook' | 'other';

export type ModelStatus = 'not-loaded' | 'loading' | 'ready' | 'error';

export type StageStatus = 'pending' | 'running' | 'done';

export interface HistoryItem {
  id: string;
  date: string;
  platform: Platform;
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
}

export interface AnalysisInput {
  text: string;
  platform: Platform;
  imageName?: string;
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

export interface RiskReportData {
  score: number;
  piiItems: RiskDetail[];
  exifSummary: string;
  imageRiskSummary: string;
  contextSummary: string;
  memoryPattern: {
    hasData: boolean;
    frequencies: Array<{ label: string; value: number }>;
    keywords: string[];
  };
  originalText: string;
  rewrittenText: string;
  imageMasks: Array<{ id: string; label: string; checked: boolean }>;
}

export interface SettingsState {
  platforms: Record<Platform, boolean>;
  sensitivity: number;
  retentionDays: 7 | 30 | 90;
  notifications: boolean;
}

export interface ExtensionMessage {
  type: 'INJECTED_BUTTON_CLICK' | 'CONTEXT_ANALYZE_TEXT';
  payload?: {
    selectedText?: string;
  };
}
