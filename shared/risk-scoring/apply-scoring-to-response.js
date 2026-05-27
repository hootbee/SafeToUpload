"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDeterministicScoring = applyDeterministicScoring;
const compute_normalized_risk_1 = require("./compute-normalized-risk");
const risk_scoring_util_1 = require("./risk-scoring.util");
function applyDeterministicScoring(input, memoryBoost) {
    let categoryScores = input.categoryScores;
    if (memoryBoost) {
        const base = (0, compute_normalized_risk_1.computeNormalizedRisk)(input);
        categoryScores = {
            pii: (0, risk_scoring_util_1.clampScore)(base.categoryScores.pii + memoryBoost.piiBoost),
            exif: base.categoryScores.exif,
            image: base.categoryScores.image,
            context: (0, risk_scoring_util_1.clampScore)(base.categoryScores.context + memoryBoost.contextBoost),
        };
    }
    const normalized = (0, compute_normalized_risk_1.computeNormalizedRisk)({
        ...input,
        categoryScores: categoryScores,
    });
    return {
        riskScore: normalized.riskScore,
        riskLevel: normalized.riskLevel,
        categoryScores: normalized.categoryScores,
        scoreBreakdown: normalized.scoreBreakdown,
        riskReasons: normalized.riskReasons,
        escalationRules: normalized.escalationRules,
    };
}
//# sourceMappingURL=apply-scoring-to-response.js.map