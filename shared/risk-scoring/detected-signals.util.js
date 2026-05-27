"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDetectedSignals = extractDetectedSignals;
function norm(value) {
    return String(value ?? '').toLowerCase();
}
function itemMatches(item, patterns) {
    const hay = `${norm(item.type)} ${norm(item.label)} ${norm(item.description)} ${norm(item.text)}`;
    return patterns.some((p) => hay.includes(p));
}
function extractDetectedSignals(input) {
    const piiItems = input.piiItems ?? [];
    const exifItems = input.exifItems ?? [];
    const imageRisks = input.imageRisks ?? [];
    const ctx = input.contextResult ?? {};
    const ctxHay = JSON.stringify(ctx).toLowerCase();
    const platform = norm(input.platform);
    const hasGovernmentId = piiItems.some((item) => itemMatches(item, ['government_id', 'resident', '주민', 'rrn', 'ssn']));
    const hasBankAccount = piiItems.some((item) => itemMatches(item, ['account', 'bank', '계좌']));
    const hasCardNumber = piiItems.some((item) => itemMatches(item, ['card', '카드', 'credit']));
    const hasDirectPii = piiItems.some((item) => itemMatches(item, ['phone', 'email', 'name', '전화', '이메일', '이름']));
    const hasIdCardImage = imageRisks.some((item) => itemMatches(item, [
        'id_card',
        'id_card_face',
        'id_card_name',
        'id_card_rrn',
        'id_card_address',
        'passport',
        'student',
        '신분',
        '여권',
        '학생증',
    ]));
    const hasPassportOrStudentId = hasIdCardImage;
    const hasFace = imageRisks.some((item) => itemMatches(item, ['face', '얼굴']));
    const hasSensitiveDocument = imageRisks.some((item) => itemMatches(item, ['document', 'contract', 'receipt', '문서', '계약', '영수', '성적', '진단']));
    const hasBuildingSign = imageRisks.some((item) => itemMatches(item, ['building_sign', 'building sign', '건물 간판', '동호', '간판', '호수 간판']));
    const hasLicensePlate = imageRisks.some((item) => itemMatches(item, ['license_plate', 'plate', '번호판', '차량']));
    const hasGpsExif = exifItems.some((item) => itemMatches(item, ['gps', 'location', '위치', '좌표'])) ||
        ctxHay.includes('gps') ||
        ctxHay.includes('location_exposure');
    const isPublicContext = ctxHay.includes('public_upload') ||
        ctxHay.includes('sns') ||
        ctxHay.includes('공개') ||
        ['instagram', 'x', 'facebook', 'twitter'].includes(platform);
    const hasMinorOrThirdParty = ctxHay.includes('minor') ||
        ctxHay.includes('third_party') ||
        ctxHay.includes('미성년') ||
        ctxHay.includes('제3자');
    const documentWithPii = hasSensitiveDocument && hasDirectPii && (hasIdCardImage || piiItems.length >= 2);
    return {
        hasGovernmentId,
        hasBankAccount,
        hasCardNumber,
        hasIdCardImage,
        hasPassportOrStudentId,
        hasGpsExif,
        hasFace,
        hasDirectPii,
        isPublicContext,
        hasMinorOrThirdParty,
        hasSensitiveDocument,
        hasBuildingSign,
        hasLicensePlate,
        documentWithPii,
    };
}
//# sourceMappingURL=detected-signals.util.js.map