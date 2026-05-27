"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeNormalizedRisk = computeNormalizedRisk;
const category_score_fallback_util_1 = require("./category-score-fallback.util");
const detected_signals_util_1 = require("./detected-signals.util");
const risk_escalation_util_1 = require("./risk-escalation.util");
const risk_scoring_util_1 = require("./risk-scoring.util");
function computeNormalizedRisk(input) {
    const { categoryScores, riskReasons } = (0, category_score_fallback_util_1.normalizeCategoryScores)(input);
    const baseScore = (0, risk_scoring_util_1.calculateFinalRiskScore)(categoryScores);
    const baseLevel = (0, risk_scoring_util_1.calculateRiskLevel)(baseScore);
    const signals = (0, detected_signals_util_1.extractDetectedSignals)(input);
    const escalated = (0, risk_escalation_util_1.applyRiskEscalationRules)(baseScore, baseLevel, signals);
    return {
        riskScore: escalated.score,
        riskLevel: escalated.level,
        categoryScores,
        scoreBreakdown: (0, risk_scoring_util_1.buildScoreBreakdown)(categoryScores),
        riskReasons,
        escalationRules: escalated.escalations,
    };
}
//# sourceMappingURL=compute-normalized-risk.js.map