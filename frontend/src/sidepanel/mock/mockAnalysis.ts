import { ANALYSIS_STAGE_TITLES } from '../../shared/constants';
import type { AnalysisInput, AnalysisStage, RiskReportData } from '../../shared/types';

export const createInitialStages = (): AnalysisStage[] =>
  ANALYSIS_STAGE_TITLES.map((title, idx) => ({
    id: `stage-${idx + 1}`,
    title,
    status: 'pending',
    logs: [],
  }));

export const stageLogs: Record<string, string[]> = {
  'PII 탐지': ['이름/연락처 패턴 스캔 중...', '전화번호 후보 1건 탐지'],
  '컨텍스트 분석': ['문장 의도 추론 중...', '개인 일정 노출 위험 중간'],
  '이미지 분석': ['이미지 메타데이터 확인(모의)...', '위치 단서 가능성 탐지'],
  '리라이트 제안': ['위험 구간 치환안 생성 중...', '톤 유지형 대체 문장 생성'],
};

export const buildMockReport = (input: AnalysisInput): RiskReportData => ({
  score: 78,
  piiItems: [
    {
      id: 'pii-1',
      type: '연락처 노출',
      description: '휴대폰 번호 형식으로 추정되는 문자열',
      location: '텍스트 1~2문단',
      policyRef: '개인 연락처 비공개 권장',
    },
    {
      id: 'pii-2',
      type: '위치 정보 단서',
      description: '구체적인 일정/장소가 포함됨',
      location: '텍스트 마지막 문장',
      policyRef: '실시간 위치 공개 주의',
    },
  ],
  exifSummary: '촬영 시각/기기 정보가 남아있을 가능성 있음 (mock)',
  imageRiskSummary: input.imageName
    ? `업로드 이미지(${input.imageName})에서 배경 단서 위험 중간`
    : '이미지 미업로드, 텍스트 중심 분석',
  contextSummary: '친근한 문체이지만 개인 식별 정보가 포함될 수 있음',
  memoryPattern: {
    hasData: true,
    frequencies: [
      { label: '연락처', value: 6 },
      { label: '위치', value: 4 },
      { label: '일정', value: 3 },
    ],
    keywords: ['전화번호', '카페', '내일 오후', '회사 근처'],
  },
  originalText: input.text || '오늘 저녁 7시에 강남역 근처에서 만나요. 제 번호는 010-1234-5678 입니다.',
  rewrittenText:
    '오늘 저녁에 도심 근처에서 만나요. 자세한 연락은 비공개 채널로 전달드릴게요.',
  imageMasks: [
    { id: 'mask-1', label: '차량 번호판', checked: true },
    { id: 'mask-2', label: '건물 간판', checked: false },
    { id: 'mask-3', label: '얼굴', checked: true },
  ],
});
