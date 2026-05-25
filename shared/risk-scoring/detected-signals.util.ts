import type { AnalysisScoringInput, DetectedSignals } from './risk-scoring.types';

function norm(value: unknown): string {
  return String(value ?? '').toLowerCase();
}

function itemMatches(item: Record<string, unknown>, patterns: string[]): boolean {
  const hay = `${norm(item.type)} ${norm(item.label)} ${norm(item.description)} ${norm(item.text)}`;
  return patterns.some((p) => hay.includes(p));
}

export function extractDetectedSignals(input: AnalysisScoringInput): DetectedSignals {
  const piiItems = input.piiItems ?? [];
  const exifItems = input.exifItems ?? [];
  const imageRisks = input.imageRisks ?? [];
  const ctx = input.contextResult ?? {};

  const ctxHay = JSON.stringify(ctx).toLowerCase();
  const platform = norm(input.platform);

  const hasGovernmentId = piiItems.some((item) =>
    itemMatches(item, ['government_id', 'resident', '주민', 'rrn', 'ssn']),
  );
  const hasBankAccount = piiItems.some((item) =>
    itemMatches(item, ['account', 'bank', '계좌']),
  );
  const hasCardNumber = piiItems.some((item) =>
    itemMatches(item, ['card', '카드', 'credit']),
  );
  const hasDirectPii = piiItems.some((item) =>
    itemMatches(item, ['phone', 'email', 'name', '전화', '이메일', '이름']),
  );

  const hasIdCardImage = imageRisks.some((item) =>
    itemMatches(item, ['id_card', 'passport', 'student', '신분', '여권', '학생증']),
  );
  const hasPassportOrStudentId = hasIdCardImage;
  const hasFace = imageRisks.some((item) => itemMatches(item, ['face', '얼굴']));
  const hasSensitiveDocument = imageRisks.some((item) =>
    itemMatches(item, ['document', 'contract', 'receipt', '문서', '계약', '영수', '성적', '진단']),
  );
  const hasBuildingSign = imageRisks.some((item) =>
    itemMatches(item, ['building_sign', 'building', '간판', '동호', '아파트', '호수', 'sign']),
  );
  const hasLicensePlate = imageRisks.some((item) =>
    itemMatches(item, ['license_plate', 'plate', '번호판', '차량']),
  );

  const hasGpsExif =
    exifItems.some((item) => itemMatches(item, ['gps', 'location', '위치', '좌표'])) ||
    ctxHay.includes('gps') ||
    ctxHay.includes('location_exposure');

  const isPublicContext =
    ctxHay.includes('public_upload') ||
    ctxHay.includes('sns') ||
    ctxHay.includes('공개') ||
    ['instagram', 'x', 'facebook', 'twitter'].includes(platform);

  const hasMinorOrThirdParty =
    ctxHay.includes('minor') ||
    ctxHay.includes('third_party') ||
    ctxHay.includes('미성년') ||
    ctxHay.includes('제3자');

  const documentWithPii =
    hasSensitiveDocument && hasDirectPii && (hasIdCardImage || piiItems.length >= 2);

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
