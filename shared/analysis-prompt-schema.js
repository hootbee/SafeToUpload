"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIVACY_MEMORY_CONTEXT_TAGS_HINT = exports.PRIVACY_MEMORY_PII_TYPES_HINT = exports.ANALYSIS_JSON_SCHEMA_BLOCK = void 0;
exports.ANALYSIS_JSON_SCHEMA_BLOCK = `
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
  "imageRisks": [
    {
      "type": "id_card_address",
      "label": "주소",
      "severity": "critical",
      "maskGroup": "id_card",
      "bbox": { "x": 0.05, "y": 0.48, "width": 0.52, "height": 0.14 }
    }
  ],
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

imageRisks 규칙 (이미지가 있을 때):
- 보이는 민감 요소마다 항목 1개, bbox는 이미지 대비 0~1 (x,y=좌상단, width/height).
- 주민등록증·여권: id_card_face, id_card_name, id_card_rrn, id_card_address (선택 id_card_full). building_sign 사용 금지.
- 일반: face, license_plate, building_sign(실제 간판만), document_text.
- 확실하지 않으면 빈 배열 [].

privacyMemoryCandidate 규칙:
- 실제 이메일·전화·이름·학번·주소 원문을 넣지 마세요. 유형 태그만 사용하세요.
- 학교명/회사명/병원명 원문 대신 university/workplace/hospital 태그만 사용하세요.
`;
exports.PRIVACY_MEMORY_PII_TYPES_HINT = 'email, phone, name_like, student_id_like, address_like, account_like, card_like, government_id_like, affiliation_like, face, id_card_like, document_like, plate_like';
exports.PRIVACY_MEMORY_CONTEXT_TAGS_HINT = 'university, academic_document, assignment, workplace, hospital, public_upload, social_media, private_storage, third_party_info, minor_possible, document_capture, id_card_capture, screenshot, location_exposure, contact_info, identity_bundle';
//# sourceMappingURL=analysis-prompt-schema.js.map