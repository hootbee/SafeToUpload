# Privacy Check Backend (Nest.js)

## 1) 프로젝트 목적
Chrome Extension 프론트엔드가 DB/AI/스토리지 실행 부담 없이 API만 호출해 개발할 수 있도록, Nest.js 백엔드 서버를 제공합니다.

## 2) 서버 역할
- 분석 요청/상태/결과/이력/설정 API 제공
- 개발 단계 저장소(PostgreSQL + 서버 디스크) 관리
- AI 분석은 실제 구현하지 않고 mock/proxy 계층으로 분리

## 3) 개발 모드 vs 최종 로컬 모드
- `APP_MODE=development-server`
  - 서버컴에서 Nest + PostgreSQL(Docker) 운영
  - 프론트는 `VITE_API_BASE_URL=http://서버컴IP:3000`만 설정
- `APP_MODE=local`
  - 개인 PC에서 `http://localhost:3000` 로컬 서버만 사용
  - 외부 서버컴 의존 제거, 로컬 저장 중심으로 전환 가능

## 4) 개발 단계 저장 전략
- 현재 기본: `server-db` (Prisma + PostgreSQL)
- `PERSIST_RAW_INPUT=true`면 원문(inputText/pageUrl/imagePath/rawAiResponse) 저장 가능
- `PERSIST_RAW_INPUT=false`면 민감 원문 필드는 저장 최소화(redacted/null)

## 5) 최종 로컬 저장 전환 전략
- `prisma/schema.local.prisma` 제공 (SQLite provider)
- 최종 보호 구조에서 민감 원문은 Chrome `storage.local` / IndexedDB 또는 로컬 DB로 이전 가능
- 서버에는 메타데이터 위주 저장 구조 유지

## 6) AI 미구현 범위
- 실제 AI 모델 추론/개인정보 탐지/이미지 분석/EXIF 파싱 미구현
- 현재는 `AiProxyService.mockAnalyze()` 결과 반환
- 추후 `requestExternalAiServer()`에 실제 AI_SERVER_URL 연동

## 7) 전체 구조
개발 모드:
- Extension Frontend -> Nest API -> PostgreSQL(Docker) + uploads/storage + AI mock

최종 로컬 모드:
- Extension Frontend -> localhost Nest API -> 로컬 저장소(SQLite/브라우저 로컬 저장)

## 8) DB만 Docker로 실행하는 이유
- 운영 단순화: DB 상태/볼륨만 컨테이너로 관리
- 개발 편의: Nest 서버는 일반 Node 프로세스로 빠르게 디버깅

## 9) 로컬 개인 PC 실행 방향
- 사용자는 Nest 서버만 실행
- Extension은 `http://localhost:3000` 호출
- 외부 서버컴, 외부 DB 의존 없음

## 10) 서버컴 개발 실행 방법
```bash
cd /Users/leejunhyeong/Desktop/my-project/safetoupload/server
npm install
docker compose -f docker-compose.db.yml up -d
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

헬스체크:
- `GET http://localhost:3000/health`

## 11) 프론트 개발자 연동 방법
프론트 개발자는 API만 호출하면 됩니다.
- 개발 모드: `VITE_API_BASE_URL=http://서버컴IP:3000`
- 로컬 모드: `VITE_API_BASE_URL=http://localhost:3000`

## 12) .env.example 설명
- `PORT`: 서버 포트
- `APP_MODE`: `development-server` | `local`
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `LOCAL_DATABASE_URL`: SQLite 전환용 URL
- `CORS_ORIGIN`: 허용 Origin 목록(콤마 구분)
- `UPLOAD_DIR`: 이미지 저장 경로
- `TEMP_DIR`: 임시 저장 경로
- `AI_SERVER_URL`: 추후 외부 AI 서버 주소
- `PERSIST_RAW_INPUT`: 원문 저장 정책

## 13) PostgreSQL Docker 실행
```bash
docker compose -f docker-compose.db.yml up -d
docker compose -f docker-compose.db.yml ps
```

## 14) Prisma 마이그레이션
```bash
npx prisma generate
npx prisma migrate dev --name init
```

## 15) Prisma Studio
```bash
npx prisma studio
```

## 16) Chrome Extension 프론트 연결
프론트에서 아래 API들을 호출하면 됩니다.
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

## 17) CORS 설정 방법
- `CORS_ORIGIN`을 콤마로 분리해 허용
- 예: `http://localhost:5173,chrome-extension://YOUR_EXTENSION_ID`
- 운영에서는 origin 제한 권장

## 18) API 목록 요약
- Health: 서버 상태 및 appMode 확인
- Analysis: 생성/실행(mock)/조회/상태/취소
- History: 목록/단건 삭제/전체 삭제
- Settings: 조회(없으면 기본 생성)/수정
- AiProxy: mock 응답

## 19) 나중에 AI 서버 붙일 위치
- `src/ai-proxy/ai-proxy.service.ts`
  - `requestExternalAiServer(input)` TODO 지점
  - `AI_SERVER_URL` 환경변수 이미 로드됨

## 20) 자주 발생하는 문제
- DB 컨테이너 미기동: `docker compose -f docker-compose.db.yml up -d`
- DATABASE_URL 오류: `.env` 값 점검
- CORS 오류: `CORS_ORIGIN`에 프론트/extension origin 추가
- Extension ID 변경: `chrome-extension://새ID` 반영
- 서버컴 IP 변경: 프론트 `VITE_API_BASE_URL` 갱신
- 포트 충돌: `PORT` 변경 후 재실행
- local 모드에서 서버 미기동: `npm run start:dev` 또는 `npm run start:prod`

---

## 실행 스크립트
- `npm run start:dev`
- `npm run build`
- `npm run start:prod`
- `npx prisma migrate dev`
- `npx prisma generate`
- `npx prisma studio`

## 참고
- 개발 단계에서는 프론트 개발자가 서버 API만 바라보면 됩니다.
- DB/mock 분석/서버 디스크/AI placeholder는 백엔드 서버가 관리합니다.
- 현재 서버는 실제 AI 분석을 수행하지 않고 mock 결과를 반환합니다.
- 개발 모드에서는 PostgreSQL만 Docker로 실행하고, Nest 서버는 일반 Node 서버로 실행합니다.
