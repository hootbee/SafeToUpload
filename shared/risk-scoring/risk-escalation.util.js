"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyRiskEscalationRules = applyRiskEscalationRules;
const risk_scoring_util_1 = require("./risk-scoring.util");
function applyRiskEscalationRules(score, level, signals) {
    const escalations = [];
    let adjustedScore = score;
    let adjustedLevel = level;
    const highRiskPii = signals.hasGovernmentId || signals.hasBankAccount || signals.hasCardNumber;
    if (highRiskPii) {
        adjustedLevel = (0, risk_scoring_util_1.maxRiskLevel)(adjustedLevel, 'high');
        adjustedScore = Math.max(adjustedScore, 70);
        escalations.push('고위험 식별정보가 탐지되어 높음으로 상향되었습니다.');
        if (signals.isPublicContext) {
            adjustedLevel = (0, risk_scoring_util_1.maxRiskLevel)(adjustedLevel, 'critical');
            adjustedScore = Math.max(adjustedScore, 85);
            escalations.push('고위험 PII가 공개 업로드 문맥에서 탐지되어 심각함으로 상향되었습니다.');
        }
    }
    if (signals.hasIdCardImage || signals.hasPassportOrStudentId) {
        adjustedLevel = (0, risk_scoring_util_1.maxRiskLevel)(adjustedLevel, 'critical');
        adjustedScore = Math.max(adjustedScore, 85);
        escalations.push('신분증/여권/학생증 이미지가 탐지되어 심각함으로 상향되었습니다.');
    }
    if (signals.hasSensitiveDocument) {
        adjustedLevel = (0, risk_scoring_util_1.maxRiskLevel)(adjustedLevel, 'high');
        adjustedScore = Math.max(adjustedScore, 70);
        escalations.push('민감 문서 이미지가 탐지되어 높음으로 상향되었습니다.');
    }
    if (signals.documentWithPii) {
        adjustedLevel = (0, risk_scoring_util_1.maxRiskLevel)(adjustedLevel, 'critical');
        adjustedScore = Math.max(adjustedScore, 90);
        escalations.push('문서 이미지와 PII가 함께 탐지되어 심각함으로 상향되었습니다.');
    }
    if (signals.hasGpsExif && signals.isPublicContext) {
        adjustedLevel = (0, risk_scoring_util_1.maxRiskLevel)(adjustedLevel, 'high');
        adjustedScore = Math.max(adjustedScore, 70);
        escalations.push('GPS 위치 정보가 공개 업로드 문맥에서 탐지되어 높음으로 상향되었습니다.');
    }
    if (signals.hasFace && signals.hasDirectPii) {
        adjustedLevel = (0, risk_scoring_util_1.maxRiskLevel)(adjustedLevel, 'high');
        adjustedScore = Math.max(adjustedScore, 70);
        escalations.push('얼굴과 직접 식별 개인정보가 함께 탐지되어 높음으로 상향되었습니다.');
    }
    if (signals.hasMinorOrThirdParty && signals.isPublicContext) {
        adjustedLevel = (0, risk_scoring_util_1.maxRiskLevel)(adjustedLevel, 'high');
        adjustedScore = Math.max(adjustedScore, 70);
        escalations.push('제3자·미성년자 정보가 공개 업로드 문맥에서 탐지되어 높음으로 상향되었습니다.');
    }
    adjustedScore = (0, risk_scoring_util_1.clampScore)(adjustedScore);
    if (adjustedLevel === 'low' && adjustedScore >= 35) {
        adjustedLevel = (0, risk_scoring_util_1.calculateRiskLevel)(adjustedScore);
    }
    return {
        score: adjustedScore,
        level: adjustedLevel,
        escalations,
    };
}
//# sourceMappingURL=risk-escalation.util.js.map