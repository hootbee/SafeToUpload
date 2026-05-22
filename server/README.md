# Privacy Check Backend (Nest.js)

## 목적
- 프론트는 API만 호출
- 백엔드가 DB/스토리지/mock AI를 관리
- 운영 기본은 Docker 컨테이너 기반

## 실행 모드
- `APP_MODE=development-server`: 서버컴 개발/운영 모드
- `APP_MODE=local`: 개인 PC 로컬 모드 전환용

## 현재 권장 운영 방식
- 서버: **API 컨테이너 + PostgreSQL 컨테이너**
- 프론트 개발자: `VITE_API_BASE_URL=http://서버IP:3270`

## 파일 구성
- `docker-compose.yml`: 운영 기본 (api + postgres)
- `docker-compose.dev.yml`: 백엔드 개발용 watch 모드 (api-dev + postgres)
- `docker-compose.db.yml`: DB만 단독 실행(호환용)
- `Dockerfile`: dev/prod 멀티스테이지

## 환경변수
- 샘플: `.env.example`
- 실제: `.env`

핵심 값:
- `PORT=3270`
- `APP_MODE=development-server|local`
- `DATABASE_URL` (컨테이너 운영 시 compose가 `postgres:5432`로 주입)
- `LOCAL_DATABASE_URL` (SQLite 전환 후보)
- `CORS_ORIGIN`
- `PERSIST_RAW_INPUT`

## 1) 서버 운영(권장)
```bash
cd /Users/leejunhyeong/Desktop/my-project/safetoupload/server
cp .env.example .env
docker compose up -d --build
```

로그:
```bash
docker compose logs -f api
```

마이그레이션:
```bash
docker compose exec api npx prisma migrate dev --name init
```

헬스체크:
```bash
curl http://localhost:3270/health
```

## 2) 백엔드/AI 로컬 개발 (watch)
```bash
cd /Users/leejunhyeong/Desktop/my-project/safetoupload/server
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d --build
```

코드 변경 시 `api-dev`에서 `npm run start:dev` watch 반영.

로그:
```bash
docker compose -f docker-compose.dev.yml logs -f api-dev
```

중지:
```bash
docker compose -f docker-compose.dev.yml down
```

## 3) Node 프로세스 로컬 실행 (비컨테이너)
```bash
cd /Users/leejunhyeong/Desktop/my-project/safetoupload/server
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

## npm 스크립트
- `npm run docker:up`
- `npm run docker:down`
- `npm run docker:logs`
- `npm run docker:dev:up`
- `npm run docker:dev:down`
- `npm run docker:dev:logs`

## 프론트 연동
- 일반: `VITE_API_BASE_URL=http://서버IP:3270`
- 로컬: `VITE_API_BASE_URL=http://localhost:3270`

## API
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

## AI 연결 위치
- `src/ai-proxy/ai-proxy.service.ts`
- `mockAnalyze()` 현재 사용
- `requestExternalAiServer()` TODO 확장 지점

## 트러블슈팅
- Docker 권한/데몬 문제: Docker Desktop 상태 먼저 확인
- CORS 문제: 현재 `main.ts`에서 `origin: true` (개발용 전면 허용)
- DB 인증 오류(P1000): `.env`의 DB 계정/비밀번호와 실제 DB 일치 확인
- 서버 외부 접근: `app.listen(port, '0.0.0.0')` + 포트 개방
