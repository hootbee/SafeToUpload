# 이미지 마스킹 구현 방향

SafeToUpload 확장에서 **업로드 이미지에 실제로 블러/모자이크를 적용**하고, 미리보기·다운로드까지 이어지도록 하는 설계안입니다.

---

## 1. 목표 / 비목표

### 목표 (MVP → 확장)

| 단계 | 사용자 경험 |
|------|-------------|
| **MVP** | 체크한 항목에 대해 **탐지된 영역**에 블러 적용 → 미리보기 갱신 → PNG 다운로드 |
| **v1** | 얼굴·번호판 등 **경량 탐지 모델**로 bbox 자동 생성 |
| **v2** | 서버 모드에서 이미지 업로드 + 서버 탐지/마스킹(선택) |

### 비목표 (초기에는 하지 않음)

- Gemma4 E4B/26B로 **픽셀 단위 세그멘테이션** (VLM bbox는 불안정, 추론 비용 큼)
- 실시간 카메라 마스킹
- SNS DOM에 자동 주입(별도 content-script 기능)

### 원칙

1. **로컬 우선**: 마스킹 렌더링은 브라우저 `Canvas`에서 수행 (원본이 서버로 안 가도 되게).
2. **분석과 탐지 분리**: PII **판단**은 Gemma4, **영역 좌표**는 전용 detection 파이프라인.
3. **세션 내 File 유지**: `blob:` URL만으로는 재처리·EXIF 제거에 한계 → 분석 세션 동안 `File` 참조 유지.

---

## 2. 현재 상태 (imageRisks 동적 마스킹)

```
[Gemma4 E4B] → imageRisks[] (type, label, bbox?)
       ↓ imageRisks 그대로 (필터 없음)
[buildMaskRegionsFromRisks]
       ├─ 1순위 Gemma bbox
       ├─ 2순위 OwlViT (bbox 없는 항목만, 최대 5회)
       └─ 3순위 id_card 레이아웃 / 카테고리 폴백
       ↓
[MaskRegion] N개 (체크박스 = 항목 1개)
       ↓
[ImageMaskingPanel] applyMasksToFile → 미리보기·다운로드
```

- 체크박스 = **Gemma `imageRisks` 항목 그대로** (필터·확장·레이아웃으로 항목을 추가/삭제하지 않음).
- bbox: **Gemma → OwlViT**(항목별 label/type 쿼리)만. 레이아웃·카테고리 폴백 bbox 없음.
- bbox 없는 항목은 탐지 내역에만 표시, 마스킹 영역은 생성하지 않음.

공통 타입: `shared/image-risk.types.ts`

---

## 3. 목표 아키텍처 (구현됨)

```
┌─────────────────────────────────────────────────────────────┐
│ SidePanelApp                                                 │
│  analysisImageFileRef  ← 분석 시점 File 보관                 │
│  report.maskRegions    ← 탐지 + 사용자 선택                  │
│  report.imagePreviewUrl / maskedImagePreviewUrl              │
└───────────────┬─────────────────────────────────────────────┘
                │
    ┌───────────┴───────────┐
    ▼                       ▼
┌──────────────┐    ┌──────────────────┐
│ imageDetect  │    │ imageMask        │
│ Service      │    │ Service          │
│ (Phase 1~2)  │    │ (Phase 1)        │
│              │    │                  │
│ → MaskRegion[]    │ applyMasks(file, │
│   + bbox       │   regions) → Blob  │
└──────────────┘    └──────────────────┘
                │
                ▼
        [ImageMaskingPanel]
         적용 / 다운로드 / 미리보기
```

### 데이터 모델

```ts
/** imageRisks.type 그대로 보존 */
export interface MaskRegion {
  id: string;
  riskType: string;
  category?: MaskCategory; // OwlViT·패딩 라우팅용만
  label: string;
  bbox: NormalizedBbox;
  checked: boolean;
  source: 'gemma' | 'owl' | 'layout' | 'fallback' | 'user';
}

export interface RiskReportData {
  // 기존 필드 ...
  imagePreviewUrl?: string;
  maskedImagePreviewUrl?: string;
  maskRegions: MaskRegion[];  // imageMasks 대체 또는 병행 후 제거
}
```

`AiAnalysisResponse` / 분석 JSON 스키마 확장 (선택, Phase 2b):

```json
{
  "imageRisks": [
    {
      "type": "face",
      "label": "얼굴",
      "severity": "high",
      "bbox": { "x": 0.12, "y": 0.08, "width": 0.25, "height": 0.30 }
    }
  ]
}
```

> Gemma4가 bbox를 주는 경우는 **보조**로만 쓰고, 반드시 detection 결과와 병합·검증할 것.

---

## 4. 핵심 모듈

### 4.1 `imageMaskService.ts` (Phase 1 — 최우선)

| 함수 | 역할 |
|------|------|
| `loadImageFromFile(file)` | `createImageBitmap` / `Image` 로드 |
| `applyMasks(image, regions, options)` | 선택된 `checked` 영역에 블러·모자이크 |
| `canvasToBlob(canvas, 'image/png')` | 다운로드용 |
| `revokeMaskedUrl(url)` | blob URL 정리 |

**렌더 방식 (권장)**

- 각 bbox마다 잘라낸 패치에 `ctx.filter = 'blur(12px)'` 또는 픽셀화 후 다시 그리기.
- 패딩: bbox를 5~10% 확장해 가장자리 누락 방지.

**EXIF**

- Canvas 재인코딩 PNG/JPEG는 **대부분 EXIF 제거**됨 → 다운로드 시 프라이버시 보너스.
- MVP에서 `imageRisks`와 별도로 EXIF 카드 문구와 연동 가능.

### 4.2 `imageDetectService.ts` (Phase 2)

탐지 전략 (우선순위):

| 방식 | 장점 | 단점 |
|------|------|------|
| **A. MediaPipe Face Detection (WASM)** | 얼굴 bbox 안정, 확장 MV3와 궁합 좋음 | 번호판·간판 별도 |
| **B. transformers.js object-detection** | HF 생태계 통일 | 모델 추가 다운로드·용량 |
| **C. Gemma4 JSON bbox** | 추가 모델 없음 | 좌표 환각·누락 빈번 |
| **D. MVP 폴백: 중앙 영역 / 전체 블러** | 즉시 데모 가능 | 정확도 낮음 |

**권장 조합**

- Phase 1: **D** — `maskRegions`가 비어 있고 사용자가 「마스킹 적용」 시, 체크된 카테고리당 **안내 + 전체 이미지 약한 블러** 또는 “자동 탐지 준비 중” 토스트.
- Phase 2: **A** 얼굴 + 번호판은 **경량 ONNX** (예: `onnx-community` 계열 plate detector) 또는 서버 API.
- Phase 2b: Gemma `imageRisks[].bbox`가 있으면 `source: 'auto'`로 병합, detection과 IoU 겹치면 하나로 합침.

### 4.3 UI (`ImageMaskingPanel`)

| 동작 | 구현 |
|------|------|
| 마스킹 적용 | `onApplyMask()` → `imageMaskService.applyMasks` → `setReport({ maskedImagePreviewUrl })` |
| 미리보기 | `maskedImagePreviewUrl ?? imagePreviewUrl` |
| 다운로드 | `<a download="masked.png" href={maskedUrl}>` 또는 `chrome.downloads` (권한 추가 시) |
| 체크박스 | `maskRegions[].checked` 토글 (기존 `toggleMask` 확장) |
| (선택) 영역 수정 | bbox 드래그 핸들 — Phase 3 |

`SidePanelApp`에 추가:

```ts
const analysisImageFileRef = useRef<File | null>(null);

// finishReport 시
analysisImageFileRef.current = input.imageFile ?? null;

const applyImageMask = async () => {
  const file = analysisImageFileRef.current;
  if (!file || !report) return;
  const regions = report.maskRegions.filter((r) => r.checked);
  const blob = await applyMasksToFile(file, regions);
  // revoke old masked URL, set new
};
```

---

## 5. 분석 파이프라인 연동

### 로컬 모드

1. `runLocalAnalysis` 완료 후 → `detectMaskRegions(imageFile)` 비동기 호출 (UI 블로킹 방지: 리포트 먼저 표시, 탐지 완료 시 `maskRegions` 갱신).
2. `mapAiResponseToReport`에서 `imageRisks` → `maskRegions` 초기 매핑 (label/category만, bbox는 detection이 채움).

### 서버 모드

현재 `imagePath`는 **파일명 문자열**만 저장.

| 단계 | 작업 |
|------|------|
| 4a | `POST /analysis` multipart로 이미지 업로드 → `server/uploads/images/{id}.jpg` |
| 4b | 분석·마스킹 API 분리: `POST /analysis/:id/mask` (선택) |
| 4c | 프론트는 **로컬 마스킹 우선** — 서버는 이력·대용량 처리용 |

MVP는 **서버 없이** 확장 내 `File` + Canvas만으로 완결 가능.

---

## 6. 구현 단계 (로드맵)

### Phase 1 — 렌더링 MVP (1~2일) ✅ 구현됨

- [x] `MaskRegion` 타입, `imageMaskService` (Canvas 블러)
- [x] `analysisImageFileRef` + `applyImageMask` / `downloadMaskedImage`
- [x] `ImageMaskingPanel` 버튼 연결, `maskedImagePreviewUrl` 표시
- [x] 폴백: 항목별 고정 bbox (`license_plate` / `building_sign` / `face`)

**완료 기준**: 체크 → 적용 → 미리보기 변경 → PNG 다운로드.

### Phase 2 — 자동 탐지 ✅ 구현됨

- [x] `imageDetectService`: OwlViT zero-shot (`Xenova/owlvit-base-patch32`, WASM)
- [x] 분석 중 「이미지 분석」 단계에서 탐지 → `maskRegions` bbox 반영
- [x] 탐지 실패 시 Phase 1 폴백 bbox 유지 (`source: fallback`)

### Phase 3 — UX / 정확도 (선택)

- [ ] bbox 수동 조절 (드래그)
- [ ] 번호판·간판 전용 모델
- [ ] 마스킹 강도 슬라이더 (blur radius)

### Phase 4 — 서버·이력 (선택)

- [ ] multipart 업로드, `maskedImagePath` DB 저장
- [ ] 이력 화면에서 마스킹 결과 썸네일 (저장 정책·보관 기간과 연동)

---

## 7. Gemma4와의 역할 분담

| 역할 | 담당 |
|------|------|
| “무엇이 위험한가?” (항목·label·severity) | Gemma4 `imageRisks` |
| “어디를 가릴까?” (bbox) | Gemma bbox → OwlViT(항목별) → id_card 레이아웃 |
| “실제로 가리기” | `imageMaskService` (Canvas) |

OwlViT는 **bbox가 없는 imageRisks 항목만** targeted 탐지 (`detectMaskRegionsForRisks`).

---

## 8. manifest / 성능

- Phase 2 MediaPipe 사용 시: `wasm` 리소스를 `web_accessible_resources`에 추가 (기존 `ort/` 패턴과 동일).
- 탐지 모델은 **지연 로드** (`import()`), 마스킹 화면 진입 시 prefetch 가능.
- `maskedImagePreviewUrl` / `imagePreviewUrl`은 `revokeObjectURL`로 세션 종료·새 분석 시 정리 (기존 `imagePreviewUrlRef` 패턴 확장).

---

## 9. 테스트 체크리스트

### 공통
- [ ] JPEG/PNG 업로드 후 마스킹 적용·다운로드
- [ ] 체크 해제 시 해당 영역 미적용
- [ ] 연속 분석 시 blob URL 누수 없음

### 주민등록증 (로컬 Gemma4)
- [ ] 마스킹 탭: 얼굴, 이름, 주민번호, 주소 (+ 신분증 전체, 기본 off)
- [ ] `building_sign` 항목 **표시 안 됨**
- [ ] Gemma bbox 없을 때 layout 폴백으로 각 필드 영역 생성
- [ ] skipped 안내: 항목 label 기준(「주소 — 추정 영역」)

### 간판·기타
- [ ] 실제 간판 사진: Gemma가 `building_sign` 출력 시 해당 항목 1개만 표시
- [ ] `imageRisks` 빈 배열: 마스킹 항목 없음 + 안내 (가짜 building_sign 없음)

---

## 10. 권장 작업 순서 (다음 PR)

1. `MaskRegion` + `imageMaskService.ts` + `ImageMaskingPanel` 버튼 연결 (**Phase 1**)
2. `SidePanelApp.analysisImageFileRef` + `finishReport` 연동
3. `imageDetectService` 스텁 → MediaPipe 얼굴 (**Phase 2**)
4. README에 “마스킹은 로컬 Canvas” 한 줄 링크

Agent 모드에서 **Phase 1만** 먼저 구현하면, 사용자가 체감할 수 있는 end-to-end가 가장 빠르게 완성됩니다.
