"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCandidateFromAnalysis = buildCandidateFromAnalysis;
const sanitize_util_1 = require("./sanitize.util");
function norm(value) {
    return String(value ?? '').toLowerCase();
}
function mapPiiType(type, label) {
    const hay = `${type} ${label}`;
    if (hay.includes('email') || hay.includes('이메일'))
        return 'email';
    if (hay.includes('phone') || hay.includes('전화'))
        return 'phone';
    if (hay.includes('name') || hay.includes('이름'))
        return 'name_like';
    if (hay.includes('student') || hay.includes('학번'))
        return 'student_id_like';
    if (hay.includes('address') || hay.includes('주소') || hay.includes('동호'))
        return 'address_like';
    if (hay.includes('account') || hay.includes('계좌'))
        return 'account_like';
    if (hay.includes('card') || hay.includes('카드'))
        return 'card_like';
    if (hay.includes('government') || hay.includes('주민'))
        return 'government_id_like';
    if (hay.includes('affiliation') || hay.includes('소속'))
        return 'affiliation_like';
    if (hay.includes('face') || hay.includes('얼굴'))
        return 'face';
    if (hay.includes('id_card') || hay.includes('신분'))
        return 'id_card_like';
    if (hay.includes('document') || hay.includes('문서'))
        return 'document_like';
    if (hay.includes('plate') || hay.includes('번호판'))
        return 'plate_like';
    return null;
}
function mapImageType(type) {
    const t = norm(type);
    if (t.includes('face'))
        return 'face';
    if (t.includes('license') || t.includes('plate'))
        return 'plate_like';
    if (t.includes('building'))
        return 'document_like';
    if (t.includes('id_card') || t.includes('passport'))
        return 'id_card_like';
    if (t.includes('document'))
        return 'document_like';
    return null;
}
function buildCandidateFromAnalysis(input) {
    const fromLlm = (0, sanitize_util_1.sanitizePrivacyMemoryCandidate)(input.privacyMemoryCandidate);
    const piiTypes = new Set(fromLlm.piiTypes);
    const contextTags = new Set(fromLlm.contextTags);
    const riskyCombinations = new Set(fromLlm.riskyCombinations);
    const sourceTypes = new Set(fromLlm.sourceTypes);
    for (const item of input.piiItems ?? []) {
        const mapped = mapPiiType(norm(item.type), norm(item.label));
        if (mapped)
            piiTypes.add(mapped);
    }
    for (const item of input.imageRisks ?? []) {
        const mapped = mapImageType(norm(item.type));
        if (mapped)
            piiTypes.add(mapped);
    }
    for (const item of input.exifItems ?? []) {
        const hay = `${norm(item.type)} ${norm(item.label)}`;
        if (hay.includes('gps') || hay.includes('location')) {
            contextTags.add('gps_exif');
            contextTags.add('location_exposure');
        }
    }
    const ctxHay = JSON.stringify(input.contextResult ?? {}).toLowerCase();
    if (ctxHay.includes('public') || ctxHay.includes('sns') || ctxHay.includes('공개')) {
        contextTags.add('public_upload');
    }
    if (ctxHay.includes('university') || ctxHay.includes('대학'))
        contextTags.add('university');
    if (ctxHay.includes('academic') || ctxHay.includes('과제'))
        contextTags.add('academic_document');
    if (ctxHay.includes('third') || ctxHay.includes('제3자'))
        contextTags.add('third_party_info');
    if (ctxHay.includes('minor') || ctxHay.includes('미성년'))
        contextTags.add('minor_possible');
    if (piiTypes.has('student_id_like') && contextTags.has('academic_document')) {
        riskyCombinations.add('student_id_like + academic_document');
    }
    if (piiTypes.has('email') && contextTags.has('university')) {
        riskyCombinations.add('email + university');
    }
    if (piiTypes.has('phone') && piiTypes.has('document_like')) {
        riskyCombinations.add('phone + document_like');
    }
    if (piiTypes.has('face') && piiTypes.has('name_like')) {
        riskyCombinations.add('face + name_like');
    }
    if (piiTypes.has('id_card_like') && piiTypes.size > 0) {
        riskyCombinations.add('id_card_like + any_pii');
    }
    if (contextTags.has('public_upload') && contextTags.has('third_party_info')) {
        riskyCombinations.add('public_upload + third_party_info');
    }
    if (contextTags.has('gps_exif') && contextTags.has('public_upload')) {
        riskyCombinations.add('gps_exif + public_upload');
    }
    if ((input.piiItems?.length ?? 0) > 0)
        sourceTypes.add('text');
    if ((input.imageRisks?.length ?? 0) > 0)
        sourceTypes.add('image');
    if ((input.exifItems?.length ?? 0) > 0)
        sourceTypes.add('exif');
    return (0, sanitize_util_1.sanitizePrivacyMemoryCandidate)({
        piiTypes: [...piiTypes],
        contextTags: [...contextTags],
        riskyCombinations: [...riskyCombinations],
        sourceTypes: [...sourceTypes],
        confidence: fromLlm.confidence,
        riskWeight: fromLlm.riskWeight,
    });
}
//# sourceMappingURL=build-candidate.util.js.map