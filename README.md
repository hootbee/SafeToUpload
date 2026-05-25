# SafeToUpload

개인정보 점검 Chrome Extension + Nest.js 백엔드 프로젝트입니다.

## 프로젝트 구조
- `frontend/`: Chrome Extension 프론트엔드 (React + TypeScript + Vite)
- `server/`: 백엔드 API 서버 (Nest.js + Prisma + PostgreSQL)

## 실행 방식

### 1) 중앙 서버 연결 모드
프론트는 어디서 실행하든 중앙 백엔드 서버를 호출합니다.

프론트(`frontend/.env`):
```env
VITE_API_BASE_URL=http://서버IP:3270
```

백엔드(서버 컴퓨터에서 실행):
```bash
cd server
cp .env.example .env

# Docker Compose v1
docker-compose -f docker-compose.yml up -d --build

# Docker Compose v2
# docker compose -f docker-compose.yml up -d --build
```

서버 확인:
```bash
curl http://localhost:3270/health
```

### 2) 프론트 실행
```bash
cd frontend
npm install
npm run dev
```

## Chrome Extension 로드
1. `frontend`에서 빌드
```bash
npm run build
```
2. Chrome `chrome://extensions`
3. 개발자 모드 ON
4. 압축해제 로드
5. `frontend/dist` 선택

## 실행 모드 요약
- 중앙 서버 연결: `VITE_API_BASE_URL=http://서버IP:3270`

## AI 추론 모드

| 모드 | 모델 | 실행 위치 |
|------|------|-----------|
| 로컬 | Gemma4 E4B (WebGPU) | `onnx-community/gemma-4-E4B-it-ONNX` (공식 weights: `google/gemma-4-E4B-it`) |
| 서버 | Gemma4 26B | `AI_SERVER_URL` 추론 서버 → Nest `AiProxyService` |

로컬 WebGPU는 ONNX Runtime 파일을 확장 패키지 `dist/ort/`에 번들합니다 (CDN jsdelivr 미사용). 빌드 후 `npm run build`로 `dist/ort/*.mjs`, `*.wasm`이 생성되는지 확인하세요.

로컬 모델 환경 변수 (`frontend/.env`):

```env
VITE_LOCAL_MODEL_ID=onnx-community/gemma-4-E4B-it-ONNX
# VITE_HF_TOKEN=hf_...   # HF 다운로드 오류 시
```

프론트 설정에서 모드를 선택합니다. 서버 모드 개발 시 mock AI 서버:

```bash
python3 server/scripts/ai-server-mock.py
# server/.env → AI_SERVER_URL=http://localhost:8000, AI_USE_MOCK_FALLBACK=false
```

## 위험도 산출 (Deterministic Scoring)

최종 위험 점수는 LLM 단일 값이 아니라 아래 가중합으로 계산합니다.

- PII 40% · Image 30% · EXIF 15% · Context 15%
- 공통 로직: [`shared/risk-scoring/`](shared/risk-scoring/)
- 등급: 0–34 low · 35–59 medium · 60–79 high · 80–100 critical
- 고위험 케이스는 강제 상향(escalation) 규칙 적용

## Privacy Memory

- 개인정보 **원문은 저장하지 않고** 유형·문맥·위험 조합 패턴만 저장
- 서버: PostgreSQL `PrivacyMemoryProfile` (개발용 adapter)
- 로컬: IndexedDB (`safetoupload_privacy_memory`)
- API: `GET/DELETE /privacy-memory`, `PATCH /settings/privacy-memory`

## 문서
- 백엔드 상세 문서: [`server/README.md`](./server/README.md)
- 이미지 마스킹 구현 방향: [`docs/image-masking.md`](./docs/image-masking.md)
