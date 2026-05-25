import type { DetectedSignals, RiskLevel } from './risk-scoring.types';
import { calculateRiskLevel, clampScore, maxRiskLevel } from './risk-scoring.util';

export interface EscalationResult {
  score: number;
  level: RiskLevel;
  escalations: string[];
}

export function applyRiskEscalationRules(
  score: number,
  level: RiskLevel,
  signals: DetectedSignals,
): EscalationResult {
  const escalations: string[] = [];
  let adjustedScore = score;
  let adjustedLevel = level;

  const highRiskPii =
    signals.hasGovernmentId || signals.hasBankAccount || signals.hasCardNumber;

  if (highRiskPii) {
    adjustedLevel = maxRiskLevel(adjustedLevel, 'high');
    adjustedScore = Math.max(adjustedScore, 70);
    escalations.push('고위험 식별정보가 탐지되어 최소 high로 상향되었습니다.');
    if (signals.isPublicContext) {
      adjustedLevel = maxRiskLevel(adjustedLevel, 'critical');
      adjustedScore = Math.max(adjustedScore, 85);
      escalations.push('고위험 PII가 공개 업로드 문맥에서 탐지되어 critical로 상향되었습니다.');
    }
  }

  if (signals.hasIdCardImage || signals.hasPassportOrStudentId) {
    adjustedLevel = maxRiskLevel(adjustedLevel, 'critical');
    adjustedScore = Math.max(adjustedScore, 85);
    escalations.push('신분증/여권/학생증 이미지가 탐지되어 critical로 상향되었습니다.');
  }

  if (signals.hasSensitiveDocument) {
    adjustedLevel = maxRiskLevel(adjustedLevel, 'high');
    adjustedScore = Math.max(adjustedScore, 70);
    escalations.push('민감 문서 이미지가 탐지되어 최소 high로 상향되었습니다.');
  }

  if (signals.documentWithPii) {
    adjustedLevel = maxRiskLevel(adjustedLevel, 'critical');
    adjustedScore = Math.max(adjustedScore, 90);
    escalations.push('문서 이미지와 PII가 함께 탐지되어 critical로 상향되었습니다.');
  }

  if (signals.hasGpsExif && signals.isPublicContext) {
    adjustedLevel = maxRiskLevel(adjustedLevel, 'high');
    adjustedScore = Math.max(adjustedScore, 70);
    escalations.push('GPS 위치 정보가 공개 업로드 문맥에서 탐지되어 최소 high로 상향되었습니다.');
  }

  if (signals.hasFace && signals.hasDirectPii) {
    adjustedLevel = maxRiskLevel(adjustedLevel, 'high');
    adjustedScore = Math.max(adjustedScore, 70);
    escalations.push('얼굴과 직접 식별 개인정보가 함께 탐지되어 최소 high로 상향되었습니다.');
  }

  if (signals.hasMinorOrThirdParty && signals.isPublicContext) {
    adjustedLevel = maxRiskLevel(adjustedLevel, 'high');
    adjustedScore = Math.max(adjustedScore, 70);
    escalations.push('제3자·미성년자 정보가 공개 업로드 문맥에서 탐지되어 최소 high로 상향되었습니다.');
  }

  adjustedScore = clampScore(adjustedScore);
  if (adjustedLevel === 'low' && adjustedScore >= 35) {
    adjustedLevel = calculateRiskLevel(adjustedScore);
  }

  return {
    score: adjustedScore,
    level: adjustedLevel,
    escalations,
  };
}
