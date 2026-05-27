"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_RISK_REASONS = exports.EMPTY_CATEGORY_SCORES = exports.SCORE_FORMULA_TEMPLATE = exports.RISK_LEVEL_THRESHOLDS = exports.CATEGORY_WEIGHTS = void 0;
exports.CATEGORY_WEIGHTS = {
    pii: 0.4,
    exif: 0.15,
    image: 0.3,
    context: 0.15,
};
exports.RISK_LEVEL_THRESHOLDS = {
    critical: 80,
    high: 60,
    medium: 35,
};
exports.SCORE_FORMULA_TEMPLATE = '0.40×PII + 0.15×EXIF + 0.30×Image + 0.15×Context';
exports.EMPTY_CATEGORY_SCORES = {
    pii: 0,
    exif: 0,
    image: 0,
    context: 0,
};
exports.EMPTY_RISK_REASONS = {
    pii: [],
    exif: [],
    image: [],
    context: [],
};
//# sourceMappingURL=risk-scoring.constants.js.map