/**
 * Open WebUI에서 이미지에 직접 붙여 넣을 때와 동일한 톤의 프롬프트.
 * 서버 `AI_LLM_PROMPT_PROFILE=openwebui`(또는 auto+vision) 시 LLM 요청에 사용.
 */

export interface OpenWebUiImagePromptInput {
  /** 참고용 게시글 (imageRisks bbox 작성 시 맥락만, 텍스트 PII 목록은 출력하지 않음) */
  inputText?: string;
  /** 로그·참고용 파일명 */
  imagePath?: string;
}

/** Open WebUI에 복사·붙여넣기용 JSON 스키마 (imageRisks만) */
export const OPEN_WEBUI_IMAGE_JSON_BLOCK = `
응답은 반드시 아래 JSON만 출력하세요(설명·마크다운·코드펜스 금지):

{
  "imageRisks": [
    {
      "type": "building_entrance_number",
      "label": "건물 번호",
      "severity": "low",
      "bbox": { "x": 0.41, "y": 0.69, "width": 0.18, "height": 0.06 }
    }
  ]
}

규칙:
- 이미지에 실제로 보이는 민감 요소마다 항목 1개.
- type·label은 보이는 대상을 자유롭게 명명(고정 목록 아님).
- severity: low | medium | high | critical
- bbox: 이미지 대비 0~1 (x,y=좌상단, width/height). 보이지 않으면 해당 항목을 넣지 마세요.
- 없으면 "imageRisks": []`;

/**
 * Open WebUI 채팅에 그대로 붙여 넣을 사용자 메시지(텍스트 부분).
 * 이미지는 UI에서 별도 첨부.
 */
export function buildOpenWebUiImagePrompt(input: OpenWebUiImagePromptInput = {}): string {
  const postRef =
    input.inputText?.trim() &&
    `
(참고) 함께 올릴 게시글 텍스트 — bbox·label 작성 시 맥락만 참고하고, 텍스트 PII 목록은 출력하지 마세요:
"""
${input.inputText.trim()}
"""
`;

  const fileHint = input.imagePath?.trim()
    ? `\n(파일명 참고: ${input.imagePath.trim()})`
    : '';

  return `첨부한 이미지에서 개인정보·민감 정보를 모두 찾아 주세요.${fileHint}

- 실제로 보이는 것만 나열하세요. 추측·일반론은 넣지 마세요.
- 각 항목: type(영문 식별자, 자유), label(한글 설명), severity, bbox(필수, 0~1 정규화).
- 주민등록증·신분증·간판·차량번호·얼굴·문서·주소·이름·생년월일 등 보이는 모든 민감 요소를 빠짐없이 항목화하세요.
${postRef ?? ''}
${OPEN_WEBUI_IMAGE_JSON_BLOCK}`;
}
