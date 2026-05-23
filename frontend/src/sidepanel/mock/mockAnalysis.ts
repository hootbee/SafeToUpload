import { ANALYSIS_STAGE_TITLES } from '../../shared/constants';
import type { AiAnalysisResponse } from '../../shared/aiTypes';
import type { AnalysisInput, AnalysisStage, RiskReportData } from '../../shared/types';
import type { DetectionHit } from '../../services/imageDetectService';
import { buildDynamicImageRiskSummary, buildMaskRegions } from '../../services/imageMaskService';

/** 모의 분석용 SNS 본문 (전화·이메일·주소·동호수 등은 모두 가상) */
export const MOCK_SNS_POST_TEXT = `오늘 새 아파트 입주 인증샷 올려봐요 🏠
사진에 보이는 간판 그대로라 동·호가 다 보이네요…

📍 서울시 성북구 정릉로 77, 래미안 정릉 101동 1204호
📞 연락: 010-9876-5432 / 보조 02-123-4567
✉️ 문의: minji.kim.sample@example-mail.test

내일 오후 2시에 현관 앞에서 택배 받을 예정이에요.
배송 기사님께는 "김민지"라고 말씀해 주시면 됩니다. 감사합니다!`;

export const createInitialStages = (): AnalysisStage[] =>
  ANALYSIS_STAGE_TITLES.map((title, idx) => ({
    id: `stage-${idx + 1}`,
    title,
    status: 'pending',
    logs: [],
  }));

export const stageLogs: Record<string, string[]> = {
  'PII 탐지': ['이름/연락처 패턴 스캔 중...', '전화번호·이메일 후보 탐지'],
  '컨텍스트 분석': ['문장 의도 추론 중...', '주소·동호수 노출 위험 높음'],
  '이미지 분석': ['건물 외관·간판 영역 후보 확인', 'OwlViT 보강 탐지(모의)'],
  '리라이트 제안': ['위험 구간 치환안 생성 중...', '톤 유지형 대체 문장 생성'],
};

export const buildMockReport = (input: AnalysisInput): RiskReportData => {
  const hasImage = Boolean(input.imageName);
  const sampleText = input.text?.trim() ? input.text : MOCK_SNS_POST_TEXT;

  const ai = {
    riskScore: 88,
    riskLevel: 'high' as const,
    piiItems: [
      {
        type: 'phone',
        label: '휴대전화',
        text: '010-9876-5432',
        severity: 'high',
        description: '휴대폰 번호 형식',
        location: '본문',
        policyRef: '개인 연락처 비공개 권장',
      },
      {
        type: 'email',
        label: '이메일',
        text: 'minji.kim.sample@example-mail.test',
        severity: 'medium',
        description: '이메일 주소',
        location: '본문',
        policyRef: '개인 식별 정보 최소화',
      },
      {
        type: 'address',
        label: '주소·동호수',
        text: '정릉로 77, 101동 1204호',
        severity: 'high',
        description: '도로명·아파트 동·호 노출',
        location: '본문',
        policyRef: '상세 주소 비공개 권장',
      },
      {
        type: 'name',
        label: '이름',
        text: '김민지',
        severity: 'medium',
        description: '실명 언급',
        location: '본문',
        policyRef: '실명 최소 공개',
      },
    ],
    exifItems: [{ type: 'gps', label: 'GPS 좌표 가능', severity: 'medium' }],
    imageRisks: hasImage
      ? [
          {
            type: 'building_sign',
            label: '아파트 동·호 간판',
            severity: 'high',
            description: '건물 입구 간판에 동·호수 텍스트 노출',
            bbox: { x: 0.22, y: 0.12, width: 0.56, height: 0.22 },
          },
        ]
      : [],
    contextResult: {
      summary: '입주 인증 게시글로 주소·연락처·동호수·실명이 함께 노출되어 재식별 위험이 큽니다.',
    },
    rewriteSuggestion:
      '오늘 새 집 입주 인증샷이에요. 상세 주소·동호수·연락처는 비공개로 두었어요. 궁금한 점은 DM으로 부탁드려요.',
    rawAiResponse: { mode: 'mock' },
  } satisfies AiAnalysisResponse;

  const mockDetections: DetectionHit[] = hasImage
    ? [
        {
          category: 'building_sign',
          label: 'building sign',
          score: 0.36,
          bbox: { x: 0.18, y: 0.1, width: 0.62, height: 0.26 },
        },
      ]
    : [];

  const maskBuild = buildMaskRegions(ai, hasImage, mockDetections, sampleText);

  return {
    score: 88,
    piiItems: [
      {
        id: 'pii-1',
        type: '휴대전화',
        description: '010-9876-5432 (가상 번호)',
        location: '본문',
        policyRef: '개인 연락처 비공개 권장',
      },
      {
        id: 'pii-2',
        type: '이메일',
        description: 'minji.kim.sample@example-mail.test',
        location: '본문',
        policyRef: '개인 식별 정보 최소화',
      },
      {
        id: 'pii-3',
        type: '주소·동호수',
        description: '도로명 주소 및 101동 1204호 (가상)',
        location: '본문·이미지 간판',
        policyRef: '상세 주소·세대 식별 정보 비공개',
      },
      {
        id: 'pii-4',
        type: '실명',
        description: '김민지 (가상 인명)',
        location: '본문',
        policyRef: '실명 최소 공개',
      },
    ],
    exifSummary: '촬영 위치(GPS) 메타데이터가 남아 있을 수 있음 (mock)',
    imageRiskSummary: buildDynamicImageRiskSummary(maskBuild),
    contextSummary: String(ai.contextResult.summary),
    memoryPattern: {
      hasData: true,
      frequencies: [
        { label: '연락처', value: 7 },
        { label: '주소', value: 6 },
        { label: '동호수', value: 5 },
        { label: '이름', value: 3 },
      ],
      keywords: ['010', '동', '호', '정릉로', '간판', '김민지'],
    },
    originalText: sampleText,
    rewrittenText: ai.rewriteSuggestion,
    maskRegions: maskBuild.regions,
    maskCandidateMeta: {
      gemmaCategories: maskBuild.gemmaCategories,
      detectedCategories: maskBuild.detectedCategories,
      unionCategories: maskBuild.unionCategories,
      skippedCategories: maskBuild.skippedCategories,
    },
  };
};
