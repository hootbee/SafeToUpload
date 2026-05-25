/** LLM 분석 JSON 스키마 설명 (서버·로컬 프롬프트 공통) */
export const ANALYSIS_JSON_SCHEMA_BLOCK = `
중요: riskScore/riskLevel은 참고용으로만 출력하세요. 최종 점수는 시스템이 categoryScores로 계산합니다.

JSON 스키마:
{
  "categoryScores": { "pii": 0, "exif": 0, "image": 0, "context": 0 },
  "riskReasons": {
    "pii": [],
    "exif": [],
    "image": [],
    "context": []
  },
  "piiItems": [{"type":"","label":"","text":"","severity":"","description":"","location":"","policyRef":""}],
  "exifItems": [],
  "imageRisks": [],
  "contextResult": { "summary": "위험 요약 한두 문장", "uploadContext": "public_upload|private_storage|limited_share" },
  "rewriteSuggestion": "",
  "privacyMemoryCandidate": {
    "piiTypes": ["email"],
    "contextTags": ["university"],
    "riskyCombinations": ["email + university"],
    "sourceTypes": ["text"],
    "confidence": 0.0,
    "riskWeight": 0.0
  }
}

privacyMemoryCandidate 규칙:
- 실제 이메일·전화·이름·학번·주소 원문을 넣지 마세요. 유형 태그만 사용하세요.
- 학교명/회사명/병원명 원문 대신 university/workplace/hospital 태그만 사용하세요.
`;

export const PRIVACY_MEMORY_PII_TYPES_HINT =
  'email, phone, name_like, student_id_like, address_like, account_like, card_like, government_id_like, affiliation_like, face, id_card_like, document_like, plate_like';

export const PRIVACY_MEMORY_CONTEXT_TAGS_HINT =
  'university, academic_document, assignment, workplace, hospital, public_upload, social_media, private_storage, third_party_info, minor_possible, document_capture, id_card_capture, screenshot, location_exposure, contact_info, identity_bundle';
