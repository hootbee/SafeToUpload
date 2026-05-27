# Privacy Check Backend (Nest.js)

Chrome Extension 프론트가 호출하는 백엔드 API 서버입니다.

## 핵심 역할
- 분석 요청/실행(mock)/조회/취소
- 이력/설정 API 제공
- DB/스토리지/AI mock 관리

## 실행 시나리오

### A. 운영/일반 실행 (권장)
- 컨테이너: `api(start:prod)` + `postgres`
- 파일: `docker-compose.yml`

### B. 백엔드/AI 개발 실행 (watch)
- 컨테이너: `api-dev(start:dev)` + `postgres`
- 파일: `docker-compose.dev.yml`

### C. 비컨테이너 실행
- 로컬 Node 프로세스에서 직접 실행

## 환경변수
- 샘플: `.env.example`
- 실제: `.env`

필수:
- `PORT=3270`
- `APP_MODE=development-server | local`
- `DATABASE_URL`
- `CORS_ORIGIN`
- `PERSIST_RAW_INPUT`

## 1) 운영/일반 실행
```bash
cd server
cp .env.example .env

# Compose v1
# docker-compose -f docker-compose.yml up -d --build

# Compose v2
# docker compose -f docker-compose.yml up -d --build
```

상태/로그:
```bash
# v1
# docker-compose -f docker-compose.yml ps
# docker-compose -f docker-compose.yml logs -f api

# v2
# docker compose -f docker-compose.yml ps
# docker compose -f docker-compose.yml logs -f api
```

헬스체크:
```bash
curl http://localhost:3270/health
```

## 2) 개발 watch 실행
```bash
cd server
cp .env.example .env

# v1
# docker-compose -f docker-compose.dev.yml up -d --build

# v2
# docker compose -f docker-compose.dev.yml up -d --build
```

로그:
```bash
# v1
# docker-compose -f docker-compose.dev.yml logs -f api-dev

# v2
# docker compose -f docker-compose.dev.yml logs -f api-dev
```

중지:
```bash
# v1
# docker-compose -f docker-compose.dev.yml down

# v2
# docker compose -f docker-compose.dev.yml down
```

## 3) 로컬 Node 실행
```bash
cd server
npm install
npx prisma@6.19.3 generate
npx prisma@6.19.3 migrate dev --name init
npm run start:dev
```

## Prisma
마이그레이션:
```bash
npx prisma@6.19.3 migrate dev --name init
```

Studio:
```bash
npx prisma@6.19.3 studio
```

## API 목록
- `GET /health`
- `POST /analysis`
- `POST /analysis/:id/image` — multipart `image` (서버 비전 분석용, `run` 전 호출)
- `POST /analysis/:id/run`
- `GET /analysis/:id`
- `GET /analysis/:id/status`
- `PATCH /analysis/:id/cancel`
- `GET /history`
- `DELETE /history/:id`
- `DELETE /history`
- `GET /settings`
- `PATCH /settings`
- `POST /ai-proxy/mock`
- `GET /ai-proxy/prompts/open-webui` — Open WebUI에 붙여 넣을 사용자 메시지 템플릿

## LLM 프롬프트 프로필

서버가 Open WebUI로 보내는 프롬프트는 `AI_LLM_PROMPT_PROFILE`로 선택합니다 (`shared/prompts/`).

| 값 | 동작 |
|----|------|
| `auto` (기본) | 이미지 픽셀 첨부 시 **openwebui**, 텍스트만이면 **extension** |
| `openwebui` | Open WebUI 직접 테스트와 동일한 **imageRisks 전용** 프롬프트 |
| `extension` | 게시글 전체 분석 JSON (piiItems, rewrite, categoryScores 등) |

Open WebUI UI와 동일 조건으로 A/B 하려면:

1. `.env`에 `AI_LLM_PROMPT_PROFILE=openwebui` (또는 `auto` + 이미지 업로드)
2. 또는 `GET http://localhost:3270/ai-proxy/prompts/open-webui?inputText=...` 로 프롬프트 복사 후 Open WebUI에 이미지+텍스트 붙여 넣기

## AI 연동
- `src/ai-proxy/ai-proxy.service.ts`
- 서버 모드: `POST {AI_SERVER_URL}/v1/analyze` (모델: `AI_SERVER_MODEL`, 기본 `gemma-4-26b`)
- 개발 mock: `python3 scripts/ai-server-mock.py` (포트 8000)
- `AI_USE_MOCK_FALLBACK=true` 시 AI 서버 장애 시 `mockAnalyze()` 폴백
- 로컬(WebGPU E4B) 추론은 확장 프로그램에서 실행, API 서버는 `inferenceMode=server` 요청만 처리

## 트러블슈팅
- `permission denied ... docker.sock`: Docker Desktop/권한 문제
- `error ... Desktop: permission denied`: Docker File Sharing에 프로젝트 경로 허용
- `Prisma P1000`: DB 계정/비밀번호 불일치
- `Failed to fetch`(확장): manifest host_permissions + 서버 CORS 확인
