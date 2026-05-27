"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clampScore = clampScore;
exports.clampCategoryScore = clampCategoryScore;
exports.calculateFinalRiskScore = calculateFinalRiskScore;
exports.calculateRiskLevel = calculateRiskLevel;
exports.maxRiskLevel = maxRiskLevel;
exports.buildScoreBreakdown = buildScoreBreakdown;
const risk_scoring_constants_1 = require("./risk-scoring.constants");
function clampScore(score) {
    if (Number.isNaN(score))
        return 0;
    return Math.max(0, Math.min(100, Math.round(score)));
}
function clampCategoryScore(value) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return null;
    return clampScore(n);
}
function calculateFinalRiskScore(categoryScores) {
    const score = categoryScores.pii * risk_scoring_constants_1.CATEGORY_WEIGHTS.pii +
        categoryScores.exif * risk_scoring_constants_1.CATEGORY_WEIGHTS.exif +
        categoryScores.image * risk_scoring_constants_1.CATEGORY_WEIGHTS.image +
        categoryScores.context * risk_scoring_constants_1.CATEGORY_WEIGHTS.context;
    return clampScore(score);
}
function calculateRiskLevel(score) {
    if (score >= 80)
        return 'critical';
    if (score >= 60)
        return 'high';
    if (score >= 35)
        return 'medium';
    return 'low';
}
const LEVEL_ORDER = ['low', 'medium', 'high', 'critical'];
function maxRiskLevel(a, b) {
    return LEVEL_ORDER[Math.max(LEVEL_ORDER.indexOf(a), LEVEL_ORDER.indexOf(b))] ?? b;
}
function buildScoreBreakdown(categoryScores) {
    const piiWeighted = Math.round(categoryScores.pii * risk_scoring_constants_1.CATEGORY_WEIGHTS.pii * 10) / 10;
    const exifWeighted = Math.round(categoryScores.exif * risk_scoring_constants_1.CATEGORY_WEIGHTS.exif * 10) / 10;
    const imageWeighted = Math.round(categoryScores.image * risk_scoring_constants_1.CATEGORY_WEIGHTS.image * 10) / 10;
    const contextWeighted = Math.round(categoryScores.context * risk_scoring_constants_1.CATEGORY_WEIGHTS.context * 10) / 10;
    const formula = `${risk_scoring_constants_1.SCORE_FORMULA_TEMPLATE} = ${piiWeighted} + ${exifWeighted} + ${imageWeighted} + ${contextWeighted}`;
    return {
        piiWeighted,
        exifWeighted,
        imageWeighted,
        contextWeighted,
        formula,
    };
}
//# sourceMappingURL=risk-scoring.util.js.map