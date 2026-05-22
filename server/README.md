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

## AI 연동 확장 지점
- `src/ai-proxy/ai-proxy.service.ts`
- 현재: `mockAnalyze()`
- 추후: `requestExternalAiServer()`

## 트러블슈팅
- `permission denied ... docker.sock`: Docker Desktop/권한 문제
- `error ... Desktop: permission denied`: Docker File Sharing에 프로젝트 경로 허용
- `Prisma P1000`: DB 계정/비밀번호 불일치
- `Failed to fetch`(확장): manifest host_permissions + 서버 CORS 확인
