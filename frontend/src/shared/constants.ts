import type { InferenceMode, Platform } from './types';

export const ONBOARDING_KEY = 'safeToUploadOnboardingDone';

export const PLATFORM_OPTIONS: Array<{ label: string; value: Platform }> = [
  { label: 'Instagram', value: 'instagram' },
  { label: 'X / Twitter', value: 'x' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'Other', value: 'other' },
];

/** 로컬 추론 시 Agent 진행 UI 최상단 단계 */
export const LOCAL_MODEL_LOAD_STAGE_TITLE = 'AI 모델 불러오기';

export const ANALYSIS_STAGE_TITLES = [
  'PII 탐지',
  '컨텍스트 분석',
  '이미지 분석',
  '리라이트 제안',
] as const;

export function getAnalysisStageTitles(mode: InferenceMode): string[] {
  if (mode === 'local') {
    return [LOCAL_MODEL_LOAD_STAGE_TITLE, ...ANALYSIS_STAGE_TITLES];
  }
  return [...ANALYSIS_STAGE_TITLES];
}
