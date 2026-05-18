import type { Platform } from './types';

export const ONBOARDING_KEY = 'safeToUploadOnboardingDone';

export const PLATFORM_OPTIONS: Array<{ label: string; value: Platform }> = [
  { label: 'Instagram', value: 'instagram' },
  { label: 'X / Twitter', value: 'x' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'Other', value: 'other' },
];

export const ANALYSIS_STAGE_TITLES = [
  'PII 탐지',
  '컨텍스트 분석',
  '이미지 분석',
  '리라이트 제안',
];
