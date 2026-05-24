export interface AnalysisPromptInput {
  platform: string;
  inputText?: string;
  imagePath?: string;
}

export function buildServerAnalysisPrompt(input: AnalysisPromptInput): string {
  const hasImage = Boolean(input.imagePath?.trim());
  const imageSection = hasImage
    ? `
첨부 이미지 파일명: ${input.imagePath}
(서버는 이미지 픽셀을 보지 못합니다. 게시글 텍스트·파일명 맥락으로 imageRisks를 추정하거나, 확실하지 않으면 빈 배열 []를 사용하세요.)
type은 반드시 다음 중 하나: face, license_plate, building_sign
`
    : `
imageRisks는 이미지가 없으면 빈 배열 []입니다.
`;

  return `당신은 SNS 게시 전 개인정보 점검 AI입니다. 아래 게시글을 분석하고 반드시 JSON만 출력하세요.
${imageSection}
플랫폼: ${input.platform}
게시글:
"""
${input.inputText?.trim() || '(빈 텍스트)'}
"""

rewriteSuggestion 작성 규칙(매우 중요):
- 원문의 문장 순서, 말투, 이모지, 만남·일정·주차 등 맥락은 최대한 그대로 유지한다.
- 치환·삭제 대상(치명적 개인정보만): 휴대폰 번호, 이메일 주소, 아파트 동·호수, 도로명·번지·층수 등 상세 주소, 실명, 생년월일·주민번호, 차량번호, 현관 비밀번호.
- 문장 통째 삭제, "DM으로 연락" 같은 새 안내를 임의로 여러 번 넣기, "올리지 않을게요" 같은 메타 설명은 하지 않는다.
- 수정은 해당 토큰만 일반화한다(예: 010-1234-5678 → 연락은 DM으로, 114동 403호 → 동·호는 비공개).
- rewriteSuggestion 값에는 수정된 게시글 전문만 넣는다(지침·설명·대괄호 플레이스홀더 금지).

JSON 스키마:
{
  "riskScore": 0,
  "riskLevel": "low|medium|high|critical",
  "piiItems": [{"type":"","label":"","text":"","severity":"","description":"","location":"","policyRef":""}],
  "exifItems": [],
  "imageRisks": [{"type":"face|license_plate|building_sign","label":"","severity":"","description":""}],
  "contextResult": {"summary": "위험 요약 한두 문장"},
  "rewriteSuggestion": ""
}`;
}
